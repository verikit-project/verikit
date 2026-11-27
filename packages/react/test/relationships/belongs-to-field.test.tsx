import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { act, useState } from "react";
import type { BelongsToRelationshipSchema } from "@verikit/core";
import { installJsdom } from "../dom-setup.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";

let uninstallJsdom: () => void;
// Imported after jsdom is installed: Base UI checks for a DOM once, when first
// imported. See resource-table.test.tsx.
let BelongsToRelationshipField: typeof import("../../src/relationships/index.js").BelongsToRelationshipField;

before(async () => {
  uninstallJsdom = installJsdom();
  ({ BelongsToRelationshipField } =
    await import("../../src/relationships/index.js"));
});

after(async () => {
  // Same zero-delay-eviction-timer reasoning as use-resource-mutations.test.tsx.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

function relationship(
  patch: Partial<BelongsToRelationshipSchema> = {},
): BelongsToRelationshipSchema {
  return {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "authors",
    foreignKey: "authorId",
    ...patch,
  };
}

function input(container: HTMLElement): HTMLInputElement {
  return container.querySelector(
    '[data-slot="combobox-input"]',
  ) as HTMLInputElement;
}

/**
 * Types into the picker by calling the input's React `onChange` directly, as
 * `typeIntoInput` does: React's own input-event plugin was set up before
 * jsdom existed. A typed `inputType` makes Base UI open the popup.
 */
async function typeInto(element: HTMLInputElement, text: string) {
  const key = Object.keys(element).find((prop) =>
    prop.startsWith("__reactProps$"),
  )!;
  const { onChange } = (element as unknown as Record<string, unknown>)[key] as {
    onChange: (event: unknown) => void;
  };

  await act(async () => {
    element.value = text;
    onChange({
      currentTarget: element,
      target: element,
      nativeEvent: { inputType: "insertText", defaultPrevented: false },
      preventDefault: () => {},
      stopPropagation: () => {},
      isPropagationStopped: () => false,
      isDefaultPrevented: () => false,
    });
  });
}

function options(): string[] {
  return Array.from(
    document.querySelectorAll('[data-slot="combobox-item"]'),
  ).map((item) => item.textContent ?? "");
}

function authors(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    title: `Author ${index + 1}`,
  }));
}

test("loads the first page of options and shows them, labelled, once opened", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ label: "Author", displayField: "title" })}
    />,
  );

  assert.equal(harness.container.querySelector("label")?.textContent, "Author");
  await waitFor(() => fixture.relationshipCalls.length === 1);
  assert.deepEqual(fixture.relationshipCalls[0], { pageSize: 25, page: 1 });
  await waitFor(() => input(harness.container).placeholder === "Search…");

  await typeInto(input(harness.container), "a");
  await waitFor(() => options().length === 2);
  assert.deepEqual(options(), ["Ada", "Grace"]);

  harness.cleanup();
});

function button(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text,
  );
}

test("typing searches the server after a pause, and closing clears the search", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ displayField: "title" })}
    />,
  );
  await waitFor(() => fixture.relationshipCalls.length === 1);

  await typeInto(input(harness.container), "  gra ");
  await waitFor(() => options().join() === "Grace");
  assert.deepEqual(fixture.relationshipCalls.at(-1), {
    pageSize: 25,
    search: "gra",
    page: 1,
  });

  await typeInto(input(harness.container), "zzz");
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("No matches.")),
  );

  // Escape closes the popup; the input goes back to the (empty) selection.
  await act(async () => {
    input(harness.container).dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
  await waitFor(() => input(harness.container).value === "");

  harness.cleanup();
});

test("loads further pages with Load more until every match is loaded", async () => {
  const fixture = createFakeClient(authors(30));
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ displayField: "title" })}
    />,
  );
  await typeInto(input(harness.container), "author");
  await waitFor(() =>
    fixture.relationshipCalls.some((call) => call.search === "author"),
  );
  await waitFor(() => options().length === 25 && Boolean(button("Load more")));

  const release = fixture.block("list");
  await act(async () => button("Load more")!.click());
  await waitFor(() => button("Loading…")?.disabled === true);
  release();

  await waitFor(() => options().length === 30);
  assert.equal(button("Load more"), undefined);
  assert.deepEqual(fixture.relationshipCalls.at(-1), {
    pageSize: 25,
    search: "author",
    page: 2,
  });

  harness.cleanup();
});

test("stops offering more when a page comes back empty despite the total", async () => {
  const fixture = createFakeClient(authors(3));
  const resource = fixture.client.resource("authors");
  const client = {
    ...fixture.client,
    resource: () => ({
      ...resource,
      relationship: async (name: string, params?: object) => {
        const page = await resource.relationship(name, params);
        return { ...page, records: [], total: 10 };
      },
    }),
  } as unknown as typeof fixture.client;
  const harness = setupHarness(client);

  await harness.render(
    <BelongsToRelationshipField relationship={relationship()} />,
  );
  await typeInto(input(harness.container), "a");
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("No matches.")),
  );
  assert.equal(button("Load more"), undefined);

  harness.cleanup();
});

test("shows the selected record's label when it's on the first page, without looking it up", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ displayField: "title" })}
      value="2"
    />,
  );

  await waitFor(() => input(harness.container).value === "Grace");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(fixture.relationshipCalls.length, 1);

  harness.cleanup();
});

test("looks up the selected record by id when it isn't on the first page", async () => {
  const fixture = createFakeClient(authors(30));
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ displayField: "title" })}
      value={30}
    />,
  );

  await waitFor(() => input(harness.container).value === "Author 30");
  assert.deepEqual(fixture.relationshipCalls.at(-1), {
    ids: ["30"],
    pageSize: 1,
  });

  harness.cleanup();
});

test("falls back to the raw id when the selected record can't be found", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ displayField: "title" })}
      value="999"
    />,
  );

  await waitFor(() => fixture.relationshipCalls.length === 2);
  await waitFor(() => input(harness.container).value === "999");

  harness.cleanup();
});

test("choosing an option reports its id, and Clear reports null", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(fixture.client);
  const changes: (string | null)[] = [];

  function Controlled() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <BelongsToRelationshipField
        relationship={relationship({ displayField: "title" })}
        value={value}
        onValueChange={(next) => {
          changes.push(next);
          setValue(next);
        }}
      />
    );
  }

  await harness.render(<Controlled />);
  assert.equal(
    harness.container.querySelector('[data-slot="combobox-clear"]'),
    null,
  );
  await typeInto(input(harness.container), "gra");
  await waitFor(() => options().join() === "Grace");

  await act(async () => {
    (
      document.querySelector('[data-slot="combobox-item"]') as HTMLElement
    ).click();
  });
  await waitFor(() => input(harness.container).value === "Grace");
  assert.deepEqual(changes, ["2"]);

  await act(async () => {
    (
      harness.container.querySelector(
        '[data-slot="combobox-clear"]',
      ) as HTMLButtonElement
    ).click();
  });
  await waitFor(() => changes.length === 2);
  assert.deepEqual(changes, ["2", null]);

  harness.cleanup();
});

test("labels options by id without a displayField, or when its value is null", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: null as unknown as string },
  ]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <>
      <BelongsToRelationshipField relationship={relationship()} />
      <BelongsToRelationshipField
        relationship={relationship({ displayField: "title" })}
        value="2"
      />
    </>,
  );

  assert.equal(harness.container.querySelector("label"), null);
  const [plain, nullable] = Array.from(
    harness.container.querySelectorAll<HTMLInputElement>(
      '[data-slot="combobox-input"]',
    ),
  );
  await waitFor(() => nullable!.value === "2");

  await typeInto(plain!, "a");
  await waitFor(() => options().join() === "1");

  harness.cleanup();
});

test("shows a loading placeholder while the first page is in flight", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const release = fixture.block("list");
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField relationship={relationship()} />,
  );
  assert.equal(input(harness.container).placeholder, "Loading…");
  await typeInto(input(harness.container), "a");
  await waitFor(() =>
    Boolean(
      document
        .querySelector('[data-slot="combobox-empty"]')
        ?.textContent?.includes("Loading…"),
    ),
  );

  release();
  await waitFor(() => input(harness.container).placeholder === "Search…");

  harness.cleanup();
});

test("renders an error and skips loading without a relationship name", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ name: undefined })}
      value="1"
      error="Required"
    />,
  );

  assert.equal(
    harness.container.querySelector("p.text-destructive")?.textContent,
    "Required",
  );
  const field = input(harness.container);
  assert.equal(field.id, "verikit-relationship-authors-");
  assert.equal(field.getAttribute("aria-invalid"), "true");
  assert.equal(
    field.getAttribute("aria-describedby"),
    "verikit-relationship-authors--error",
  );

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(fixture.relationshipCalls.length, 0);

  harness.cleanup();
});

test("supports an explicit id and a disabled or read-only picker, which can't be cleared", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(fixture.client);

  await harness.render(
    <>
      <BelongsToRelationshipField
        relationship={relationship({ label: "Author" })}
        id="author-picker"
        value="1"
        disabled
        className="custom-picker"
      />
      <BelongsToRelationshipField
        relationship={relationship()}
        value="1"
        readOnly
      />
    </>,
  );

  await waitFor(() => fixture.relationshipCalls.length >= 1);
  const field = harness.container.querySelector(
    "#author-picker",
  ) as HTMLInputElement;
  assert.equal(field.disabled, true);
  assert.ok(harness.container.querySelector(".custom-picker"));
  assert.equal(
    harness.container.querySelector('[data-slot="combobox-clear"]'),
    null,
  );

  harness.cleanup();
});

test("shows a relationship fetch failure instead of silently leaving the picker empty", async () => {
  const fixture = createFakeClient([]);
  fixture.failNext.list = new Error("Could not load authors.");
  const harness = setupHarness(fixture.client);

  await harness.render(
    <BelongsToRelationshipField relationship={relationship()} />,
  );

  await waitFor(() =>
    Boolean(harness.container.querySelector('[role="alert"]')),
  );
  assert.match(
    harness.container.querySelector('[role="alert"]')?.textContent ?? "",
    /Could not load authors/,
  );

  harness.cleanup();
});

test("a resource form loads picker options from the owning resource's route", async () => {
  const { belongsTo, defineResource, text } = await import("@verikit/core");
  const { ResourceForm } = await import("../../src/resource/index.js");
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const requested: string[] = [];
  const client = {
    ...fixture.client,
    resource: ((name: string) => {
      requested.push(name);
      return fixture.client.resource(name);
    }) as typeof fixture.client.resource,
  };
  const author = defineResource("author", { fields: { name: text() } });
  const article = defineResource("article", {
    fields: { authorId: text().formHidden() },
    relationships: (field) => ({
      author: belongsTo(() => author).via(field("authorId")),
    }),
  });
  const harness = setupHarness(client);

  await harness.render(<ResourceForm resource={article} />);
  await waitFor(() => fixture.relationshipCalls.length === 1);

  // The server serves pickers at /{owner}/relationships/{name}, so the
  // request must go to "article", not the target "author".
  assert.deepEqual([...new Set(requested)], ["article"]);

  harness.cleanup();
});
