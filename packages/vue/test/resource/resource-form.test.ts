import assert from "node:assert/strict";
import test from "node:test";
import { belongsTo, defineResource, text } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { ResourceForm } from "../../src/resource/resource-form.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";
import type { FakeRecord } from "../query/fixtures.js";

const postResource = defineResource("posts", {
  fields: { title: text().required() },
});

test("renders one input per visible field and a submit button", () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, { resource: postResource });

  assert.equal(wrapper.find('input[name="title"]').exists(), true);
  assert.notEqual(wrapper.find('button[type="submit"]').text(), "");

  harness.cleanup();
});

test("skips a formHidden field's input, unlike a plain hidden field it's only a form concern", () => {
  const resourceWithFormHidden = defineResource("posts", {
    fields: {
      title: text().required(),
      internalNote: text().formHidden(),
    },
  });
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, { resource: resourceWithFormHidden });

  assert.equal(wrapper.find('input[name="title"]').exists(), true);
  assert.equal(wrapper.find('input[name="internalNote"]').exists(), false);

  harness.cleanup();
});

test("submitting creates a record and reports it via onSuccess", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);
  const created: FakeRecord[] = [];

  const wrapper = harness.mountWithProvider(ResourceForm, {
    resource: postResource,
    onSuccess: (record: FakeRecord) => created.push(record),
  });

  await wrapper.find('input[name="title"]').setValue("New post");
  await wrapper.find("form").trigger("submit");

  await waitFor(() => calls.create === 1);
  await waitFor(() => created.length === 1);
  assert.equal(created[0]?.title, "New post");

  harness.cleanup();
});

test("submitting with an id updates instead of creating", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, { resource: postResource, id: "1" });

  await wrapper.find('input[name="title"]').setValue("Changed");
  await wrapper.find("form").trigger("submit");

  await waitFor(() => calls.update === 1);
  assert.equal(calls.create, 0);

  harness.cleanup();
});

test("a validation failure blocks submission and shows the field error, not a submit error", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, { resource: postResource });

  await wrapper.find("form").trigger("submit");

  await waitFor(() => /required/i.test(wrapper.text()));
  assert.equal(calls.create, 0);
  assert.equal(wrapper.find('[role="alert"]').exists(), false);

  harness.cleanup();
});

test("disables the submit button and swaps its label while a mutation is in flight", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, {
    resource: postResource,
    submitLabel: "Create",
  });

  await wrapper.find('input[name="title"]').setValue("New post");

  const release = block("create");
  await wrapper.find("form").trigger("submit");

  await waitFor(() => wrapper.find('button[type="submit"]').attributes("disabled") !== undefined);
  assert.match(wrapper.find('button[type="submit"]').text(), /Saving/);

  release();
  await waitFor(() => wrapper.find('button[type="submit"]').attributes("disabled") === undefined);
  assert.match(wrapper.find('button[type="submit"]').text(), /Create/);

  harness.cleanup();
});

test("a failed mutation surfaces as a submit-error alert", async () => {
  const { client, failNext } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, { resource: postResource, id: "1" });

  await wrapper.find('input[name="title"]').setValue("Changed");
  failNext.update = true;
  await wrapper.find("form").trigger("submit");

  await waitFor(() => wrapper.find('[role="alert"]').exists());
  assert.match(wrapper.find('[role="alert"]').text(), /Simulated update failure/);

  harness.cleanup();
});

test("a server unique-constraint issue appears on its field with the custom message", async () => {
  const resource = defineResource("posts", {
    fields: { email: text().required().unique("That email is already taken.") },
  });
  const { client, failNext } = createFakeClient([]);
  failNext.create = new VerikitClientError(400, "Validation failed", "VALIDATION_ERROR", {
    issues: [{ path: ["email"], message: "That email is already taken." }],
  });
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, { resource });

  await wrapper.find('input[name="email"]').setValue("ada@example.com");
  await wrapper.find("form").trigger("submit");

  await waitFor(() => /already taken/.test(wrapper.text()));
  assert.match(wrapper.text(), /That email is already taken/);

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

  const wrapper = harness.mountWithProvider(ResourceForm, {
    resource: postWithAuthor,
    defaultValues: { authorId: "2" },
  });

  assert.equal(wrapper.find("label").text(), "Author");
  assert.equal(wrapper.find('[data-slot="select-trigger"]').exists(), true);

  await wrapper.find('input[name="title"]').setValue("New post");
  await wrapper.find("form").trigger("submit");

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

  const wrapper = harness.mountWithProvider(ResourceForm, { resource: conditionalResource });

  assert.equal(wrapper.find('input[name="note"]').exists(), false);

  await wrapper.find('input[name="title"]').setValue("New post");
  await wrapper.find("form").trigger("submit");

  await waitFor(() => calls.create === 1);
  assert.equal(records[0]?.title, "New post");
  assert.equal((records[0] as unknown as { note?: string }).note, undefined);

  await wrapper.find('input[name="kind"]').setValue("custom");
  await waitFor(() => wrapper.find('input[name="note"]').exists());

  await wrapper.find('input[name="note"]').setValue("Extra detail");
  await wrapper.find("form").trigger("submit");

  await waitFor(() => calls.create === 2);
  assert.equal((records[1] as unknown as { note?: string }).note, "Extra detail");

  harness.cleanup();
});
