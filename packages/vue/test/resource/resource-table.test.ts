import assert from "node:assert/strict";
import test from "node:test";
import { boolean, date, defineResource, number, text } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { h, nextTick } from "vue";
import { ResourceTable } from "../../src/resource/resource-table.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";
import type { FakeRecord } from "../query/fixtures.js";

/**
 * `VueWrapper#element` types as `T['$el']`, which resolves too loosely for
 * `querySelectorAll(...).find/some(...)` chains to infer a useful element
 * type. Casting once here keeps every call site's own selector untouched.
 */
function root(wrapper: { element: unknown }): HTMLElement {
  return wrapper.element as HTMLElement;
}

async function click(element: Element | null | undefined): Promise<void> {
  assert.ok(element, "element not found");
  (element as HTMLElement).click();
  await nextTick();
}

async function type(
  element: Element | null | undefined,
  value: string,
): Promise<void> {
  assert.ok(element, "element not found");
  (element as HTMLInputElement).value = value;
  element!.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

function findButtonByText(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );
  assert.ok(button, `no button with text "${label}"`);
  return button as HTMLButtonElement;
}

const postResource = defineResource("posts", {
  fields: {
    title: text().required().sortable(),
    body: text().hidden(),
    status: text(),
  },
});

const filterableResource = defineResource("articles", {
  fields: {
    title: text().required().filterable(),
    views: number().filterable(),
    category: text(),
  },
});

test("renders visible columns and row data once the query resolves, skipping hidden fields", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  const headerText = root(wrapper).querySelector("thead")?.textContent ?? "";
  assert.match(headerText, /title/i);
  assert.match(headerText, /status/i);
  assert.doesNotMatch(headerText, /body/i);
  assert.match(root(wrapper).textContent ?? "", /Hello/);

  harness.cleanup();
});

test("clicking a sortable header drives the sort param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  const sortButton = root(wrapper).querySelector("thead button");
  await click(sortButton);
  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.sort?.field, "title");

  harness.cleanup();
});

test("typing into the search box drives the search param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
  });
  await waitFor(() => fixture.calls.list === 1);

  const search = root(wrapper).querySelector('input[type="search"]');
  await type(search, "hello");
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

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    pageSize: 1,
  });
  await waitFor(() => root(wrapper).textContent?.includes("One") === true);

  const previous = root(wrapper).querySelector(
    '[aria-label="Previous page"]',
  ) as HTMLButtonElement;
  const next = root(wrapper).querySelector(
    '[aria-label="Next page"]',
  ) as HTMLButtonElement;
  assert.equal(previous.disabled, true);
  assert.equal(next.disabled, false);

  await click(next);
  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.page, 2);
  assert.equal(fixture.lastListParams?.pageSize, 1);

  harness.cleanup();
});

test("renders a custom emptyState when there are no records", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    emptyState: "Nothing here yet.",
  });
  await waitFor(
    () => root(wrapper).textContent?.includes("Nothing here yet.") === true,
  );

  harness.cleanup();
});

test("falls back to a default empty message when no emptyState is given", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
  });
  await waitFor(
    () => root(wrapper).textContent?.includes("No records found.") === true,
  );

  harness.cleanup();
});

test("surfaces the underlying query's error as an alert", async () => {
  const { client, failNext } = createFakeClient([]);
  failNext.list = true;
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
  });
  await waitFor(() => root(wrapper).querySelector('[role="alert"]') !== null);

  assert.match(
    root(wrapper).querySelector('[role="alert"]')?.textContent ?? "",
    /Simulated list failure/,
  );

  harness.cleanup();
});

test("renderActions renders per-row content and forwards the row's record", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  const clicked: string[] = [];

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    renderActions: (record: FakeRecord) =>
      h(
        "button",
        {
          type: "button",
          "data-testid": "row-action",
          onClick: () => clicked.push(record.id),
        },
        "Edit",
      ),
  });
  await waitFor(
    () => root(wrapper).querySelector('[data-testid="row-action"]') !== null,
  );

  await click(root(wrapper).querySelector('[data-testid="row-action"]'));
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

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: richResource,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Launch") === true);

  assert.match(root(wrapper).textContent ?? "", /Yes/);
  assert.match(root(wrapper).textContent ?? "", /No/);
  assert.match(root(wrapper).textContent ?? "", /2024/);

  harness.cleanup();
});

test("the previous-page button navigates back after advancing", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    pageSize: 1,
  });
  await waitFor(() => root(wrapper).textContent?.includes("One") === true);

  await click(root(wrapper).querySelector('[aria-label="Next page"]'));
  await waitFor(() => fixture.calls.list === 2);

  await click(root(wrapper).querySelector('[aria-label="Previous page"]'));
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

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: emptyResource,
  });
  await waitFor(
    () => root(wrapper).textContent?.includes("No records found.") === true,
  );

  harness.cleanup();
});

test("clicking a sortable number column's header defaults to descending", async () => {
  const numericResource = defineResource("posts-with-views", {
    fields: { title: text().required(), views: number().sortable() },
  });
  const fixture = createFakeClient([
    { id: "1", title: "Hello", views: 10 } as unknown as FakeRecord,
  ]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: numericResource,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  const viewsHeader = Array.from(
    root(wrapper).querySelectorAll("thead button"),
  ).find((button) => button.textContent?.includes("views"));
  assert.ok(viewsHeader);

  await click(viewsHeader);
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

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  assert.match(root(wrapper).textContent ?? "", /New/);
  assert.ok(root(wrapper).querySelector('[aria-label="Edit"]'));
  assert.ok(root(wrapper).querySelector('[aria-label="Delete"]'));

  harness.cleanup();
});

test("the New button opens a create dialog; submitting creates a record and closes it", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => fixture.calls.list === 1);

  await click(findButtonByText("New"));
  await waitFor(() => document.querySelector('input[name="title"]') !== null);

  await type(document.querySelector('input[name="title"]'), "New post");
  await click(findButtonByText("Create"));

  await waitFor(() => fixture.calls.create === 1);
  assert.equal(fixture.records[0]?.title, "New post");
  await waitFor(() => document.querySelector('input[name="title"]') === null);

  harness.cleanup();
});

test("closing the create dialog via its own close button discards it without creating a record", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => fixture.calls.list === 1);

  await click(findButtonByText("New"));
  await waitFor(() => document.querySelector('input[name="title"]') !== null);

  await click(document.querySelector('[aria-label="Close"]'));
  await waitFor(() => document.querySelector('input[name="title"]') === null);
  assert.equal(fixture.calls.create, 0);

  harness.cleanup();
});

test("create denied by permission hides the New button after a failed attempt", async () => {
  const fixture = createFakeClient([]);
  fixture.failNext.create = new VerikitClientError(
    403,
    "Forbidden.",
    "FORBIDDEN",
  );
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => fixture.calls.list === 1);

  await click(findButtonByText("New"));
  await waitFor(() => document.querySelector('input[name="title"]') !== null);

  await type(document.querySelector('input[name="title"]'), "Whatever");
  await click(findButtonByText("Create"));

  await waitFor(() => fixture.calls.create === 1);
  await waitFor(
    () =>
      !Array.from(root(wrapper).querySelectorAll("button")).some((button) =>
        button.textContent?.includes("New"),
      ),
  );

  harness.cleanup();
});

test("the Edit button opens a dialog pre-filled with the row's values; submitting updates the record", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  await click(root(wrapper).querySelector('[aria-label="Edit"]'));
  await waitFor(() => document.querySelector('input[name="title"]') !== null);

  const titleInput = document.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  assert.equal(titleInput.value, "Hello");

  await type(titleInput, "Updated");
  await click(findButtonByText("Save changes"));

  await waitFor(() => fixture.calls.update === 1);
  assert.equal(fixture.records[0]?.title, "Updated");
  await waitFor(() => document.querySelector('input[name="title"]') === null);

  harness.cleanup();
});

test("closing the Edit dialog via its close button discards the pending edit", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  const editButtons = () =>
    root(wrapper).querySelectorAll('[aria-label="Edit"]');
  await click(editButtons()[0]);
  await waitFor(() => document.querySelector('input[name="title"]') !== null);
  assert.equal(
    (document.querySelector('input[name="title"]') as HTMLInputElement).value,
    "Hello",
  );

  await click(document.querySelector('[aria-label="Close"]'));
  await waitFor(() => document.querySelector('input[name="title"]') === null);
  assert.equal(fixture.calls.update, 0);

  // Reopening on a different row proves the dialog's own close path (not
  // just a successful submit) actually reset `editRecord`, rather than
  // leaving the first row's record wired up underneath.
  await click(editButtons()[1]);
  await waitFor(() => document.querySelector('input[name="title"]') !== null);
  assert.equal(
    (document.querySelector('input[name="title"]') as HTMLInputElement).value,
    "World",
  );

  harness.cleanup();
});

test("update denied by permission hides that row's Edit button, leaving Delete visible", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.update = new VerikitClientError(
    403,
    "Forbidden.",
    "FORBIDDEN",
  );
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  await click(root(wrapper).querySelector('[aria-label="Edit"]'));
  await waitFor(() => document.querySelector('input[name="title"]') !== null);

  await type(document.querySelector('input[name="title"]'), "Updated");
  await click(findButtonByText("Save changes"));

  await waitFor(() => fixture.calls.update === 1);
  await waitFor(
    () => root(wrapper).querySelector('[aria-label="Edit"]') === null,
  );
  assert.ok(root(wrapper).querySelector('[aria-label="Delete"]'));

  harness.cleanup();
});

test("the Delete button opens a confirmation dialog; Cancel closes it without deleting", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  await click(root(wrapper).querySelector('[aria-label="Delete"]'));
  await waitFor(
    () => document.body.textContent?.includes("Delete this posts?") === true,
  );

  await click(findButtonByText("Cancel"));

  await waitFor(
    () => document.body.textContent?.includes("Delete this posts?") === false,
  );
  assert.equal(fixture.calls.delete, 0);

  harness.cleanup();
});

test("confirming Delete calls the delete mutation and closes the dialog on success", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  await click(root(wrapper).querySelector('[aria-label="Delete"]'));
  await waitFor(
    () => document.body.textContent?.includes("Delete this posts?") === true,
  );

  await click(findButtonByText("Delete"));

  await waitFor(() => fixture.calls.delete === 1);
  await waitFor(
    () => document.body.textContent?.includes("Delete this posts?") === false,
  );

  harness.cleanup();
});

test("a non-permission delete failure shows the inline error and keeps the Delete button visible", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.delete = true;
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  await click(root(wrapper).querySelector('[aria-label="Delete"]'));
  await waitFor(
    () => document.body.textContent?.includes("Delete this posts?") === true,
  );

  await click(findButtonByText("Delete"));

  await waitFor(() => document.querySelector('[role="alert"]') !== null);
  assert.match(
    document.querySelector('[role="alert"]')?.textContent ?? "",
    /Simulated delete failure/,
  );
  assert.ok(root(wrapper).querySelector('[aria-label="Delete"]'));

  harness.cleanup();
});

test("the Delete confirm button disables and relabels while the mutation is in flight", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const release = fixture.block("delete");

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  await click(root(wrapper).querySelector('[aria-label="Delete"]'));
  await waitFor(
    () => document.body.textContent?.includes("Delete this posts?") === true,
  );

  await click(findButtonByText("Delete"));

  await waitFor(() => document.body.textContent?.includes("Deleting") === true);
  assert.equal(findButtonByText("Deleting…").disabled, true);

  release();
  await waitFor(() => fixture.calls.delete === 1);

  harness.cleanup();
});

test("delete denied by permission hides that row's Delete button and suppresses the inline error", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.delete = new VerikitClientError(
    403,
    "Forbidden.",
    "FORBIDDEN",
  );
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  await click(root(wrapper).querySelector('[aria-label="Delete"]'));
  await waitFor(
    () => document.body.textContent?.includes("Delete this posts?") === true,
  );

  await click(findButtonByText("Delete"));

  await waitFor(() => fixture.calls.delete === 1);
  await waitFor(
    () => root(wrapper).querySelector('[aria-label="Delete"]') === null,
  );
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.ok(root(wrapper).querySelector('[aria-label="Edit"]'));

  harness.cleanup();
});

test("actions and renderActions render together in the same row", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
    renderActions: () =>
      h("button", { type: "button", "data-testid": "custom-action" }, "Custom"),
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  assert.ok(root(wrapper).querySelector('[aria-label="Edit"]'));
  assert.ok(root(wrapper).querySelector('[aria-label="Delete"]'));
  assert.ok(root(wrapper).querySelector('[data-testid="custom-action"]'));

  harness.cleanup();
});

test("no Filters toggle renders when no field is filterable", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  assert.doesNotMatch(root(wrapper).textContent ?? "", /Filters/);

  harness.cleanup();
});

test("the Filters toggle shows a per-field filter panel with a control per filterable field", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: filterableResource,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  assert.equal(root(wrapper).querySelector('[aria-label="title"]'), null);

  await click(findButtonByText("Filters"));

  assert.ok(root(wrapper).querySelector('[aria-label="title"]'));
  assert.ok(root(wrapper).querySelector('[aria-label="views minimum"]'));
  assert.ok(root(wrapper).querySelector('[aria-label="views maximum"]'));
  // `category` isn't `filterable()`, so it gets no control.
  assert.equal(root(wrapper).querySelector('[aria-label="category"]'), null);

  harness.cleanup();
});

test("typing an exact-match filter drives the list request's filters param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: filterableResource,
  });
  await waitFor(() => fixture.calls.list === 1);

  await click(findButtonByText("Filters"));
  const titleFilter = root(wrapper).querySelector('[aria-label="title"]');

  await type(titleFilter, "Hello");
  await waitFor(() => fixture.calls.list === 2);
  assert.deepEqual(fixture.lastListParams?.filters, { title: { eq: "Hello" } });

  harness.cleanup();
});

test("a number field's min/max filter inputs drive gte/lte, clearing back to unfiltered when emptied", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: filterableResource,
  });
  await waitFor(() => fixture.calls.list === 1);

  await click(findButtonByText("Filters"));
  const min = root(wrapper).querySelector('[aria-label="views minimum"]');
  const max = root(wrapper).querySelector('[aria-label="views maximum"]');

  await type(min, "10");
  await waitFor(() => fixture.calls.list === 2);
  assert.deepEqual(fixture.lastListParams?.filters, { views: { gte: 10 } });

  await type(max, "20");
  await waitFor(() => fixture.calls.list === 3);
  assert.deepEqual(fixture.lastListParams?.filters, {
    views: { gte: 10, lte: 20 },
  });

  await type(min, "");
  await type(max, "");
  await waitFor(() => fixture.calls.list === 5);
  assert.equal(fixture.lastListParams?.filters, undefined);

  harness.cleanup();
});

test("Clear filters removes every active filter and disappears once none remain", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: filterableResource,
  });
  await waitFor(() => fixture.calls.list === 1);

  await click(findButtonByText("Filters"));
  await type(root(wrapper).querySelector('[aria-label="title"]'), "Hello");
  await waitFor(() => fixture.calls.list === 2);
  assert.ok(
    Array.from(root(wrapper).querySelectorAll("button")).some(
      (button) => button.textContent === "Clear filters",
    ),
  );

  await click(findButtonByText("Clear filters"));
  await waitFor(() => fixture.calls.list === 3);
  assert.equal(fixture.lastListParams?.filters, undefined);
  assert.ok(
    !Array.from(root(wrapper).querySelectorAll("button")).some(
      (button) => button.textContent === "Clear filters",
    ),
  );

  harness.cleanup();
});

test("selecting a row shows the bulk selection bar with a count; Clear empties it", async () => {
  const { client } = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("One") === true);

  const rowCheckbox = root(wrapper)
    .querySelector("table tbody tr")
    ?.querySelector('[aria-label="Select row"]');
  assert.ok(rowCheckbox);

  await click(rowCheckbox);
  assert.match(root(wrapper).textContent ?? "", /1 selected/);

  await click(findButtonByText("Clear"));
  assert.doesNotMatch(root(wrapper).textContent ?? "", /selected/);

  harness.cleanup();
});

test("the select-all header checkbox selects every row and goes indeterminate on a partial selection", async () => {
  const { client } = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("One") === true);

  const table = root(wrapper).querySelector("table") as HTMLElement;
  const selectAll = table.querySelector(
    '[aria-label="Select all rows"]',
  ) as HTMLElement;
  const rowCheckboxes = table.querySelectorAll('[aria-label="Select row"]');

  await click(selectAll);
  assert.match(root(wrapper).textContent ?? "", /2 selected/);

  await click(rowCheckboxes[0]);
  assert.match(root(wrapper).textContent ?? "", /1 selected/);
  assert.equal(selectAll.getAttribute("aria-checked"), "mixed");

  harness.cleanup();
});

test("the mobile card layout's own row checkbox selects the same row as its desktop counterpart", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  // With one row, `[aria-label="Select row"]` matches twice — once in the
  // (CSS-hidden, but still mounted) desktop table, once in the mobile card
  // layout. The second is the mobile card's own checkbox.
  const checkboxes = root(wrapper).querySelectorAll(
    '[aria-label="Select row"]',
  );
  assert.equal(checkboxes.length, 2);

  await click(checkboxes[1]);
  assert.match(root(wrapper).textContent ?? "", /1 selected/);

  harness.cleanup();
});

test("Cancel on the bulk-delete dialog closes it without deleting", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  const table = root(wrapper).querySelector("table") as HTMLElement;
  await click(table.querySelector('[aria-label="Select row"]'));
  await click(findButtonByText("Delete selected"));
  await waitFor(
    () => document.body.textContent?.includes("Delete 1 posts?") === true,
  );

  await click(findButtonByText("Cancel"));
  await waitFor(
    () => document.body.textContent?.includes("Delete 1 posts?") === false,
  );
  assert.equal(fixture.calls.delete, 0);
  // Cancelling the dialog doesn't itself clear the selection.
  assert.match(root(wrapper).textContent ?? "", /1 selected/);

  harness.cleanup();
});

test("Delete selected opens a bulk confirmation dialog; confirming deletes every selected record and clears selection", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("One") === true);

  const table = root(wrapper).querySelector("table") as HTMLElement;
  const selectAll = table.querySelector(
    '[aria-label="Select all rows"]',
  ) as HTMLElement;

  await click(selectAll);
  await click(findButtonByText("Delete selected"));
  await waitFor(
    () => document.body.textContent?.includes("Delete 2 posts?") === true,
  );

  await click(findButtonByText("Delete"));

  await waitFor(() => fixture.calls.delete === 2);
  await waitFor(
    () => document.body.textContent?.includes("Delete 2 posts?") === false,
  );
  assert.doesNotMatch(root(wrapper).textContent ?? "", /selected/);

  harness.cleanup();
});

test("a partial bulk-delete failure shows an inline failure count and keeps the dialog open", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  fixture.failNext.delete = true;
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    actions: true,
  });
  await waitFor(() => root(wrapper).textContent?.includes("One") === true);

  const table = root(wrapper).querySelector("table") as HTMLElement;
  await click(table.querySelector('[aria-label="Select all rows"]'));
  await click(findButtonByText("Delete selected"));
  await waitFor(
    () => document.body.textContent?.includes("Delete 2 posts?") === true,
  );

  await click(findButtonByText("Delete"));

  await waitFor(() => fixture.calls.delete === 2);
  await waitFor(() => document.querySelector('[role="alert"]') !== null);
  assert.match(
    document.querySelector('[role="alert"]')?.textContent ?? "",
    /1 of 2 couldn't be deleted/,
  );
  // The dialog itself is still mounted and open (its title's live count just
  // shifted, since the one record that *did* delete drops out of both the
  // list and the selection it belonged to).
  assert.ok(
    Array.from(document.querySelectorAll("button")).some(
      (button) => button.textContent === "Cancel",
    ),
  );

  harness.cleanup();
});

test("renderBulkActions renders custom bulk content and works without `actions`", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  const seen: unknown[] = [];

  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    renderBulkActions: (records: FakeRecord[], clearSelection: () => void) =>
      h(
        "button",
        {
          type: "button",
          "data-testid": "bulk-export",
          onClick: () => {
            seen.push(records.map((record) => record.id));
            clearSelection();
          },
        },
        "Export",
      ),
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);

  const table = root(wrapper).querySelector("table") as HTMLElement;
  await click(table.querySelector('[aria-label="Select row"]'));
  assert.match(root(wrapper).textContent ?? "", /1 selected/);
  // No `actions`, so no built-in bulk delete — only the custom bulk action.
  assert.equal(
    Array.from(root(wrapper).querySelectorAll("button")).some(
      (button) => button.textContent === "Delete selected",
    ),
    false,
  );

  await click(root(wrapper).querySelector('[data-testid="bulk-export"]'));
  assert.deepEqual(seen, [["1"]]);
  assert.doesNotMatch(root(wrapper).textContent ?? "", /selected/);

  harness.cleanup();
});
