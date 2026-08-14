import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { belongsTo, defineResource, text } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { installJsdom, typeIntoInput } from "../dom-setup.js";
import { ResourceForm } from "../../src/resource/index.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "../query/fixtures.js";

const postResource = defineResource("posts", {
  fields: { title: text().required() },
});

let uninstallJsdom: () => void;

before(() => {
  uninstallJsdom = installJsdom();
});

after(async () => {
  // Same zero-delay-eviction-timer reasoning as use-resource-mutations.test.tsx.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

test("renders one input per visible field and a submit button", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(<ResourceForm<FakeRecord> resource={postResource} />);

  assert.ok(harness.container.querySelector('input[name="title"]'));
  assert.ok(
    harness.container.querySelector('button[type="submit"]')?.textContent,
  );

  harness.cleanup();
});

test("skips a formHidden field's input, unlike a plain hidden field it's only a form concern", async () => {
  const resourceWithFormHidden = defineResource("posts", {
    fields: {
      title: text().required(),
      internalNote: text().formHidden(),
    },
  });
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={resourceWithFormHidden} />,
  );

  assert.ok(harness.container.querySelector('input[name="title"]'));
  assert.equal(
    harness.container.querySelector('input[name="internalNote"]'),
    null,
  );

  harness.cleanup();
});

test("submitting creates a record and reports it via onSuccess", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);
  const created: FakeRecord[] = [];

  await harness.render(
    <ResourceForm<FakeRecord>
      resource={postResource}
      onSuccess={(record) => created.push(record)}
    />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "New post");

  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => calls.create === 1);
  await waitFor(() => created.length === 1);
  assert.equal(created[0]?.title, "New post");

  harness.cleanup();
});

test("submitting with an id updates instead of creating", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={postResource} id="1" />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "Changed");

  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => calls.update === 1);
  assert.equal(calls.create, 0);

  harness.cleanup();
});

test("a validation failure blocks submission and shows the field error, not a submit error", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(<ResourceForm<FakeRecord> resource={postResource} />);

  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() =>
    Boolean(harness.container.textContent?.match(/required/i)),
  );
  assert.equal(calls.create, 0);
  assert.equal(harness.container.querySelector('[role="alert"]'), null);

  harness.cleanup();
});

test("disables the submit button and swaps its label while a mutation is in flight", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={postResource} submitLabel="Create" />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "New post");

  const release = block("create");
  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(
    () =>
      (
        harness.container.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement
      ).disabled,
  );
  assert.match(
    harness.container.querySelector('button[type="submit"]')?.textContent ?? "",
    /Saving/,
  );

  release();
  await waitFor(
    () =>
      !(
        harness.container.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement
      ).disabled,
  );
  assert.match(
    harness.container.querySelector('button[type="submit"]')?.textContent ?? "",
    /Create/,
  );

  harness.cleanup();
});

test("a failed mutation surfaces as a submit-error alert", async () => {
  const { client, failNext } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={postResource} id="1" />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "Changed");

  failNext.update = true;
  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() =>
    Boolean(harness.container.querySelector('[role="alert"]')),
  );
  assert.match(
    harness.container.querySelector('[role="alert"]')?.textContent ?? "",
    /Simulated update failure/,
  );

  harness.cleanup();
});

test("a server unique-constraint issue appears on its field with the custom message", async () => {
  const resource = defineResource("posts", {
    fields: { email: text().required().unique("That email is already taken.") },
  });
  const { client, failNext } = createFakeClient([]);
  failNext.create = new VerikitClientError(
    400,
    "Validation failed",
    "VALIDATION_ERROR",
    { issues: [{ path: ["email"], message: "That email is already taken." }] },
  );
  const harness = setupHarness(client);

  await harness.render(<ResourceForm<FakeRecord> resource={resource} />);

  typeIntoInput(
    harness.container.querySelector('input[name="email"]') as HTMLInputElement,
    "ada@example.com",
  );
  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() =>
    Boolean(harness.container.textContent?.match(/already taken/)),
  );
  assert.match(
    harness.container.textContent ?? "",
    /That email is already taken/,
  );

  harness.cleanup();
});

test("a belongsTo relationship (no .form()) renders its built-in picker, and its foreign key submits with the record", async () => {
  const author = defineResource("authors", { fields: { name: text() } });
  const postWithAuthor = defineResource("posts", {
    fields: { title: text().required(), authorId: text().formHidden() },
    relationships: (field) => ({
      author: belongsTo(() => author)
        .via(field("authorId"))
        .label("Author")
        .displayField("name"),
    }),
  });
  const { client, records } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord>
      resource={postWithAuthor}
      defaultValues={{ authorId: "2" }}
    />,
  );

  assert.equal(harness.container.querySelector("label")?.textContent, "Author");
  assert.ok(harness.container.querySelector('[data-slot="select-trigger"]'));

  typeIntoInput(
    harness.container.querySelector('input[name="title"]') as HTMLInputElement,
    "New post",
  );
  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => records.length === 1);
  assert.equal(records[0]?.title, "New post");
  assert.equal((records[0] as unknown as { authorId?: string }).authorId, "2");

  harness.cleanup();
});

test("a conditionally-visible field is hidden until its condition is met, and shown once it is", async () => {
  const conditionalResource = defineResource("posts", {
    fields: {
      title: text().required(),
      kind: text().default("standard"),
      note: text().required().visibleWhen("kind", "custom"),
    },
  });
  const { client, calls, records } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={conditionalResource} />,
  );

  assert.equal(harness.container.querySelector('input[name="note"]'), null);

  typeIntoInput(
    harness.container.querySelector('input[name="title"]') as HTMLInputElement,
    "New post",
  );
  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => calls.create === 1);
  assert.equal(records[0]?.title, "New post");
  assert.equal((records[0] as unknown as { note?: string }).note, undefined);

  typeIntoInput(
    harness.container.querySelector('input[name="kind"]') as HTMLInputElement,
    "custom",
  );
  await waitFor(() =>
    Boolean(harness.container.querySelector('input[name="note"]')),
  );

  typeIntoInput(
    harness.container.querySelector('input[name="note"]') as HTMLInputElement,
    "Extra detail",
  );
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => calls.create === 2);
  assert.equal(
    (records[1] as unknown as { note?: string }).note,
    "Extra detail",
  );

  harness.cleanup();
});
