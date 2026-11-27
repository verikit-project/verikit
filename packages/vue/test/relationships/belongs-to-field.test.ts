import assert from "node:assert/strict";
import test from "node:test";
import type { BelongsToRelationshipSchema } from "@verikit/core";
import { defineComponent, h, nextTick, ref } from "vue";
import { BelongsToRelationshipField } from "../../src/relationships/belongs-to-field.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";

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

function input(root: ParentNode = document): HTMLInputElement {
  return root.querySelector('[data-slot="combobox-input"]') as HTMLInputElement;
}

/** Types into the picker as the browser would: a new value, then `input`. */
async function typeInto(element: HTMLInputElement, text: string) {
  element.value = text;
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
  await nextTick();
}

function options(): string[] {
  return Array.from(
    document.querySelectorAll('[data-slot="combobox-item"]'),
  ).map((item) => item.textContent ?? "");
}

function button(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text,
  );
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

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ label: "Author", displayField: "title" }),
  });

  assert.equal(wrapper.find("label").text(), "Author");
  await waitFor(() => fixture.relationshipCalls.length === 1);
  assert.deepEqual(fixture.relationshipCalls[0], { pageSize: 25, page: 1 });
  await waitFor(() => input().placeholder === "Search…");

  await typeInto(input(), "a");
  await waitFor(() => options().length === 2);
  assert.deepEqual(options(), ["Ada", "Grace"]);

  harness.cleanup();
});

test("typing searches the server after a pause, and closing clears the search", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ displayField: "title" }),
  });
  await waitFor(() => fixture.relationshipCalls.length === 1);

  await typeInto(input(), "  gra ");
  await waitFor(() => options().join() === "Grace");
  assert.deepEqual(fixture.relationshipCalls.at(-1), {
    pageSize: 25,
    search: "gra",
    page: 1,
  });

  await typeInto(input(), "zzz");
  await waitFor(() =>
    Boolean(document.body.textContent?.includes("No matches.")),
  );

  // Escape closes the popup; the input goes back to the (empty) selection.
  input().dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await waitFor(
    () =>
      input().value === "" &&
      document.querySelector('[data-slot="combobox-content"]') === null,
  );

  harness.cleanup();
});

test("loads further pages with Load more until every match is loaded", async () => {
  const fixture = createFakeClient(authors(30));
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ displayField: "title" }),
  });
  await typeInto(input(), "author");
  await waitFor(() =>
    fixture.relationshipCalls.some((call) => call.search === "author"),
  );
  await waitFor(() => options().length === 25 && Boolean(button("Load more")));

  const release = fixture.block("list");
  button("Load more")!.click();
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

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship(),
  });
  await typeInto(input(), "a");
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

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ displayField: "title" }),
    value: "2",
  });

  await waitFor(() => input().value === "Grace");
  assert.equal(input().placeholder, "Grace");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(fixture.relationshipCalls.length, 1);

  harness.cleanup();
});

test("looks up the selected record by id when it isn't on the first page", async () => {
  const fixture = createFakeClient(authors(30));
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ displayField: "title" }),
    value: 30,
  });

  await waitFor(() => input().value === "Author 30");
  assert.deepEqual(fixture.relationshipCalls.at(-1), {
    ids: ["30"],
    pageSize: 1,
  });

  harness.cleanup();
});

test("falls back to the raw id when the selected record can't be found", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ displayField: "title" }),
    value: "999",
  });

  await waitFor(() => fixture.relationshipCalls.length === 2);
  await waitFor(() => input().value === "999");

  harness.cleanup();
});

test("choosing an option reports its id, and Clear reports null", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(fixture.client);
  const changes: (string | null)[] = [];

  const Controlled = defineComponent({
    setup() {
      const value = ref<string | null>(null);
      return () =>
        h(BelongsToRelationshipField, {
          relationship: relationship({ displayField: "title" }),
          value: value.value,
          onValueChange: (next: string | null) => {
            changes.push(next);
            value.value = next;
          },
        });
    },
  });

  harness.mountWithProvider(Controlled);
  await waitFor(() => fixture.relationshipCalls.length === 1);
  assert.equal(document.querySelector('[data-slot="combobox-clear"]'), null);
  await typeInto(input(), "gra");
  await waitFor(() => options().join() === "Grace");

  (
    document.querySelector('[data-slot="combobox-item"]') as HTMLElement
  ).click();
  await waitFor(() => input().value === "Grace");
  assert.deepEqual(changes, ["2"]);

  (
    document.querySelector('[data-slot="combobox-clear"]') as HTMLButtonElement
  ).click();
  await waitFor(() => changes.length === 2);
  assert.deepEqual(changes, ["2", null]);
  await waitFor(() => input().value === "");

  harness.cleanup();
});

test("the toggle opens the popup with the loaded options, and a change without onValueChange is ignored", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ displayField: "title" }),
  });
  await waitFor(() => fixture.relationshipCalls.length === 1);

  (
    document.querySelector(
      '[data-slot="combobox-trigger"]',
    ) as HTMLButtonElement
  ).click();
  await waitFor(() => options().join() === "Ada");

  (
    document.querySelector('[data-slot="combobox-item"]') as HTMLElement
  ).click();
  await waitFor(
    () => document.querySelector('[data-slot="combobox-content"]') === null,
  );
  // Uncontrolled by a parent, the value doesn't change.
  assert.equal(input().value, "");

  harness.cleanup();
});

test("labels options by id without a displayField, or when its value is null", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: null as unknown as string },
  ]);
  const harness = setupHarness(fixture.client);

  const plainWrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship(),
  });
  const nullableWrapper = harness.mountWithProvider(
    BelongsToRelationshipField,
    {
      relationship: relationship({ displayField: "title" }),
      value: "2",
    },
  );

  assert.equal(plainWrapper.find("label").exists(), false);
  const plain = input(plainWrapper.element as HTMLElement);
  const nullable = input(nullableWrapper.element as HTMLElement);
  await waitFor(() => nullable.value === "2");

  await typeInto(plain, "a");
  await waitFor(() => options().join() === "1");

  harness.cleanup();
});

test("shows a loading placeholder while the first page is in flight", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const release = fixture.block("list");
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship(),
  });
  await nextTick();
  assert.equal(input().placeholder, "Loading…");
  await typeInto(input(), "a");
  await waitFor(() =>
    Boolean(
      document
        .querySelector('[data-slot="combobox-empty"]')
        ?.textContent?.includes("Loading…"),
    ),
  );

  release();
  await waitFor(() => input().placeholder === "Search…");

  harness.cleanup();
});

test("renders an error and skips loading without a relationship name", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ name: undefined }),
    value: "1",
    error: "Required",
  });

  assert.equal(wrapper.find("p.text-destructive").text(), "Required");
  const field = input();
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

test("supports an explicit id and a disabled or read-only picker, which can't be cleared or opened", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(fixture.client);
  let blurred = 0;

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ label: "Author" }),
    id: "author-picker",
    value: "1",
    disabled: true,
    className: "custom-picker",
  });
  const readOnlyWrapper = harness.mountWithProvider(
    BelongsToRelationshipField,
    {
      relationship: relationship(),
      value: "1",
      readOnly: true,
      onBlur: () => {
        blurred += 1;
      },
    },
  );

  await waitFor(() => fixture.relationshipCalls.length >= 1);
  const field = document.querySelector("#author-picker") as HTMLInputElement;
  assert.equal(field.disabled, true);
  assert.ok(document.querySelector(".custom-picker"));
  assert.equal(document.querySelector('[data-slot="combobox-clear"]'), null);

  const readOnly = input(readOnlyWrapper.element as HTMLElement);
  assert.equal(readOnly.readOnly, true);
  readOnly.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.querySelector('[data-slot="combobox-content"]'), null);

  readOnly.dispatchEvent(new window.FocusEvent("blur"));
  assert.equal(blurred, 1);

  harness.cleanup();
});

test("shows a relationship fetch failure instead of silently leaving the picker empty", async () => {
  const fixture = createFakeClient([]);
  fixture.failNext.list = new Error("Could not load authors.");
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship(),
  });

  await waitFor(() => wrapper.find('[role="alert"]').exists());
  assert.match(wrapper.find('[role="alert"]').text(), /Could not load authors/);

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

  harness.mountWithProvider(ResourceForm, { resource: article });
  await waitFor(() => fixture.relationshipCalls.length === 1);

  // The server serves pickers at /{owner}/relationships/{name}, so the
  // request must go to "article", not the target "author".
  assert.deepEqual([...new Set(requested)], ["article"]);

  harness.cleanup();
});
