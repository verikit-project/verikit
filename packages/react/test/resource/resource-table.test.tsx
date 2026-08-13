import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { boolean, date, defineResource, number, text } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { act } from "react";
import { installJsdom, typeIntoInput } from "../dom-setup.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "../query/fixtures.js";

// Imported dynamically, after `installJsdom()` runs in `before()` below,
// rather than as a normal static import. `ResourceTable` (via its dialogs)
// pulls in `@base-ui/react`'s floating-ui-backed Dialog, whose module-scope
// setup runs once, the first time anything imports it, and feature-detects
// the DOM at that moment. A static import here would evaluate before
// `before()` ever runs (imports are always hoisted above other module code),
// so floating-ui would see no `document`/`window` yet and permanently treat
// itself as running outside a browser  its popups would then never mount,
// with no thrown error to explain why.
let ResourceTable: typeof import("../../src/resource/index.js").ResourceTable;

function findButtonByText(text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text,
  );
  assert.ok(button, `no button with text "${text}"`);
  return button as HTMLButtonElement;
}

const postResource = defineResource("posts", {
  fields: {
    title: text().required().sortable(),
    body: text().hidden(),
    status: text(),
  },
});

let uninstallJsdom: () => void;

before(async () => {
  uninstallJsdom = installJsdom();
  ({ ResourceTable } = await import("../../src/resource/index.js"));
});

after(async () => {
  // Same zero-delay-eviction-timer reasoning as use-resource-mutations.test.tsx.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

test("renders visible columns and row data once the query resolves, skipping hidden fields", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  await harness.render(<ResourceTable<FakeRecord> resource={postResource} />);
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  const headerText = harness.container.querySelector("thead")?.textContent;
  assert.match(headerText ?? "", /title/i);
  assert.match(headerText ?? "", /status/i);
  assert.doesNotMatch(headerText ?? "", /body/i);
  assert.match(harness.container.textContent ?? "", /Hello/);

  harness.cleanup();
});

test("clicking a sortable header drives the sort param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(<ResourceTable<FakeRecord> resource={postResource} />);
  // Wait for the row to actually render (not just for the request to have
  // started): TanStack Table infers a text column's first sort direction
  // from a sampled cell value, and that sample isn't available until the
  // data has loaded  clicking before then makes the first click's
  // direction depend on load timing instead of being deterministic. (Which
  // direction a *second* click lands on is exactly this same sampling
  // timing, already covered deterministically at the hook level in
  // use-resource-table.test.tsx via explicit `toggleSorting(true/false)`, so
  // this component test only proves the rendered header is wired to sort at
  // all  not both directions of TanStack's own auto-detection heuristic.)
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  const sortButton = harness.container.querySelector("thead button");
  assert.ok(sortButton);

  act(() => {
    (sortButton as HTMLButtonElement).click();
  });
  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.sort?.field, "title");

  harness.cleanup();
});

test("typing into the search box drives the search param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(<ResourceTable<FakeRecord> resource={postResource} />);
  await waitFor(() => fixture.calls.list === 1);

  const search = harness.container.querySelector(
    'input[type="search"]',
  ) as HTMLInputElement;
  assert.ok(search);

  typeIntoInput(search, "hello");
  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.search, "hello");

  harness.cleanup();
});

test("pagination buttons are boundary-disabled and drive the page param", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} pageSize={1} />,
  );
  await waitFor(() => Boolean(harness.container.textContent?.includes("One")));

  const previous = harness.container.querySelector(
    '[aria-label="Previous page"]',
  ) as HTMLButtonElement;
  const next = harness.container.querySelector(
    '[aria-label="Next page"]',
  ) as HTMLButtonElement;
  assert.equal(previous.disabled, true);
  assert.equal(next.disabled, false);

  act(() => {
    next.click();
  });
  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.page, 2);
  assert.equal(fixture.lastListParams?.pageSize, 1);

  harness.cleanup();
});

test("renders a custom emptyState when there are no records", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceTable<FakeRecord>
      resource={postResource}
      emptyState="Nothing here yet."
    />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Nothing here yet.")),
  );

  harness.cleanup();
});

test("falls back to a default empty message when no emptyState is given", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(<ResourceTable<FakeRecord> resource={postResource} />);
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("No records found.")),
  );

  harness.cleanup();
});

test("surfaces the underlying query's error as an alert", async () => {
  const { client, failNext } = createFakeClient([]);
  failNext.list = true;
  const harness = setupHarness(client);

  await harness.render(<ResourceTable<FakeRecord> resource={postResource} />);
  await waitFor(() =>
    Boolean(harness.container.querySelector('[role="alert"]')),
  );

  assert.match(
    harness.container.querySelector('[role="alert"]')?.textContent ?? "",
    /Simulated list failure/,
  );

  harness.cleanup();
});

test("renderActions renders per-row content and forwards the row's record", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  const clicked: string[] = [];

  await harness.render(
    <ResourceTable<FakeRecord>
      resource={postResource}
      renderActions={(record) => (
        <button
          type="button"
          data-testid="row-action"
          onClick={() => clicked.push(record.id)}
        >
          Edit
        </button>
      )}
    />,
  );
  await waitFor(() =>
    Boolean(harness.container.querySelector('[data-testid="row-action"]')),
  );

  const action = harness.container.querySelector(
    '[data-testid="row-action"]',
  ) as HTMLButtonElement;
  action.click();
  assert.deepEqual(clicked, ["1"]);

  harness.cleanup();
});

test("renders Date and boolean values as friendly cell text", async () => {
  const richResource = defineResource("events", {
    fields: {
      title: text().required(),
      published: boolean(),
      startsAt: date(),
    },
  });
  const { client } = createFakeClient([
    {
      id: "1",
      title: "Launch",
      published: true,
      startsAt: new Date("2024-06-15T10:00:00Z"),
    } as unknown as FakeRecord,
    {
      id: "2",
      title: "Draft",
      published: false,
      startsAt: new Date("2024-06-16T10:00:00Z"),
    } as unknown as FakeRecord,
  ]);
  const harness = setupHarness(client);

  await harness.render(<ResourceTable<FakeRecord> resource={richResource} />);
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Launch")),
  );

  assert.match(harness.container.textContent ?? "", /Yes/);
  assert.match(harness.container.textContent ?? "", /No/);
  assert.match(harness.container.textContent ?? "", /2024/);

  harness.cleanup();
});

test("the previous-page button navigates back after advancing", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} pageSize={1} />,
  );
  await waitFor(() => Boolean(harness.container.textContent?.includes("One")));

  const next = harness.container.querySelector(
    '[aria-label="Next page"]',
  ) as HTMLButtonElement;
  act(() => {
    next.click();
  });
  await waitFor(() => fixture.calls.list === 2);

  const previous = harness.container.querySelector(
    '[aria-label="Previous page"]',
  ) as HTMLButtonElement;
  act(() => {
    previous.click();
  });
  await waitFor(() => fixture.calls.list === 3);
  assert.equal(fixture.lastListParams?.page, 1);

  harness.cleanup();
});

test("renders without crashing when every field is hidden (zero columns)", async () => {
  const emptyResource = defineResource("hidden-only", {
    fields: { secret: text().hidden() },
  });
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(<ResourceTable<FakeRecord> resource={emptyResource} />);
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("No records found.")),
  );

  harness.cleanup();
});

test("clicking a sortable number column's header defaults to descending", async () => {
  const numericResource = defineResource("posts-with-views", {
    fields: {
      title: text().required(),
      views: number().sortable(),
    },
  });
  const fixture = createFakeClient([
    { id: "1", title: "Hello", views: 10 } as unknown as FakeRecord,
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={numericResource} />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  const viewsHeader = Array.from(
    harness.container.querySelectorAll("thead button"),
  ).find((button) => button.textContent?.includes("views"));
  assert.ok(viewsHeader);

  act(() => {
    (viewsHeader as HTMLButtonElement).click();
  });
  await waitFor(() => fixture.calls.list === 2);
  assert.deepEqual(fixture.lastListParams?.sort, {
    field: "views",
    direction: "desc",
  });

  harness.cleanup();
});

test("actions renders a New button plus Edit/Delete row actions", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  assert.match(harness.container.textContent ?? "", /New/);
  assert.ok(harness.container.querySelector('[aria-label="Edit"]'));
  assert.ok(harness.container.querySelector('[aria-label="Delete"]'));

  harness.cleanup();
});

test("the New button opens a create dialog; submitting creates a record and closes it", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() => fixture.calls.list === 1);

  act(() => {
    findButtonByText("New").click();
  });
  await waitFor(() => Boolean(document.querySelector('input[name="title"]')));

  typeIntoInput(
    document.querySelector('input[name="title"]') as HTMLInputElement,
    "New post",
  );
  act(() => {
    findButtonByText("Create").click();
  });

  await waitFor(() => fixture.calls.create === 1);
  assert.equal(fixture.records[0]?.title, "New post");
  await waitFor(() => !document.querySelector('input[name="title"]'));

  harness.cleanup();
});

test("create denied by permission hides the New button after a failed attempt", async () => {
  const fixture = createFakeClient([]);
  fixture.failNext.create = new VerikitClientError(403, "Forbidden.");
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() => fixture.calls.list === 1);

  act(() => {
    findButtonByText("New").click();
  });
  await waitFor(() => Boolean(document.querySelector('input[name="title"]')));

  typeIntoInput(
    document.querySelector('input[name="title"]') as HTMLInputElement,
    "Whatever",
  );
  act(() => {
    findButtonByText("Create").click();
  });

  await waitFor(() => fixture.calls.create === 1);
  await waitFor(
    () =>
      !Array.from(harness.container.querySelectorAll("button")).some((button) =>
        button.textContent?.includes("New"),
      ),
  );

  harness.cleanup();
});

test("the Edit button opens a dialog pre-filled with the row's values; submitting updates the record", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  act(() => {
    (
      harness.container.querySelector(
        '[aria-label="Edit"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() => Boolean(document.querySelector('input[name="title"]')));

  const titleInput = document.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  assert.equal(titleInput.value, "Hello");

  typeIntoInput(titleInput, "Updated");
  act(() => {
    findButtonByText("Save changes").click();
  });

  await waitFor(() => fixture.calls.update === 1);
  assert.equal(fixture.records[0]?.title, "Updated");
  await waitFor(() => !document.querySelector('input[name="title"]'));

  harness.cleanup();
});

test("closing the Edit dialog via its close button discards the pending edit", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  const editButtons = () =>
    harness.container.querySelectorAll('[aria-label="Edit"]');
  act(() => {
    (editButtons()[0] as HTMLButtonElement).click();
  });
  await waitFor(() => Boolean(document.querySelector('input[name="title"]')));
  assert.equal(
    (document.querySelector('input[name="title"]') as HTMLInputElement).value,
    "Hello",
  );

  act(() => {
    (
      document.querySelector('[aria-label="Close"]') as HTMLButtonElement
    ).click();
  });
  await waitFor(() => !document.querySelector('input[name="title"]'));
  assert.equal(fixture.calls.update, 0);

  // Reopening on a different row proves the dialog's own close path (not
  // just a successful submit) actually reset `editRecord`, rather than
  // leaving the first row's record wired up underneath.
  act(() => {
    (editButtons()[1] as HTMLButtonElement).click();
  });
  await waitFor(() => Boolean(document.querySelector('input[name="title"]')));
  assert.equal(
    (document.querySelector('input[name="title"]') as HTMLInputElement).value,
    "World",
  );

  harness.cleanup();
});

test("update denied by permission hides that row's Edit button, leaving Delete visible", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.update = new VerikitClientError(403, "Forbidden.");
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  act(() => {
    (
      harness.container.querySelector(
        '[aria-label="Edit"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() => Boolean(document.querySelector('input[name="title"]')));

  typeIntoInput(
    document.querySelector('input[name="title"]') as HTMLInputElement,
    "Updated",
  );
  act(() => {
    findButtonByText("Save changes").click();
  });

  await waitFor(() => fixture.calls.update === 1);
  await waitFor(() => !harness.container.querySelector('[aria-label="Edit"]'));
  assert.ok(harness.container.querySelector('[aria-label="Delete"]'));

  harness.cleanup();
});

test("the Delete button opens a confirmation dialog; Cancel closes it without deleting", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  act(() => {
    (
      harness.container.querySelector(
        '[aria-label="Delete"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("Delete this posts?")),
  );

  act(() => {
    findButtonByText("Cancel").click();
  });

  await waitFor(
    () => !document.body.textContent?.includes("Delete this posts?"),
  );
  assert.equal(fixture.calls.delete, 0);

  harness.cleanup();
});

test("confirming Delete calls the delete mutation and closes the dialog on success", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  act(() => {
    (
      harness.container.querySelector(
        '[aria-label="Delete"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("Delete this posts?")),
  );

  act(() => {
    findButtonByText("Delete").click();
  });

  await waitFor(() => fixture.calls.delete === 1);
  await waitFor(
    () => !document.body.textContent?.includes("Delete this posts?"),
  );

  harness.cleanup();
});

test("a non-permission delete failure shows the inline error and keeps the Delete button visible", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.delete = true;
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  act(() => {
    (
      harness.container.querySelector(
        '[aria-label="Delete"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("Delete this posts?")),
  );

  act(() => {
    findButtonByText("Delete").click();
  });

  await waitFor(() => Boolean(document.querySelector('[role="alert"]')));
  assert.match(
    document.querySelector('[role="alert"]')?.textContent ?? "",
    /Simulated delete failure/,
  );
  assert.ok(harness.container.querySelector('[aria-label="Delete"]'));

  harness.cleanup();
});

test("the Delete confirm button disables and relabels while the mutation is in flight", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const release = fixture.block("delete");

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  act(() => {
    (
      harness.container.querySelector(
        '[aria-label="Delete"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("Delete this posts?")),
  );

  act(() => {
    findButtonByText("Delete").click();
  });

  await waitFor(() => Boolean(document.body.textContent?.includes("Deleting")));
  assert.equal(findButtonByText("Deleting…").disabled, true);

  act(() => {
    release();
  });
  await waitFor(() => fixture.calls.delete === 1);

  harness.cleanup();
});

test("delete denied by permission hides that row's Delete button and suppresses the inline error", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.delete = new VerikitClientError(403, "Forbidden.");
  const harness = setupHarness(fixture.client);

  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} actions />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  act(() => {
    (
      harness.container.querySelector(
        '[aria-label="Delete"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("Delete this posts?")),
  );

  act(() => {
    findButtonByText("Delete").click();
  });

  await waitFor(() => fixture.calls.delete === 1);
  await waitFor(
    () => !harness.container.querySelector('[aria-label="Delete"]'),
  );
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.ok(harness.container.querySelector('[aria-label="Edit"]'));

  harness.cleanup();
});

test("actions and renderActions render together in the same row", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceTable<FakeRecord>
      resource={postResource}
      actions
      renderActions={() => (
        <button type="button" data-testid="custom-action">
          Custom
        </button>
      )}
    />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );

  assert.ok(harness.container.querySelector('[aria-label="Edit"]'));
  assert.ok(harness.container.querySelector('[aria-label="Delete"]'));
  assert.ok(harness.container.querySelector('[data-testid="custom-action"]'));

  harness.cleanup();
});
