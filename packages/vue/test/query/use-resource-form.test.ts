import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text } from "@verikit/core";
import { defineComponent, h } from "vue";
import { useResourceForm } from "../../src/query/index.js";
import { createFakeClient, setupHarness } from "./fixtures.js";
import type { FakeRecord } from "./fixtures.js";

const contact = defineResource("Contact", {
  fields: {
    name: text().required(),
  },
});

test("useResourceForm creates a record with no id, and reports it via onSuccess", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);
  const created: unknown[] = [];

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceForm<FakeRecord>(contact, {
        onSuccess: (record) => created.push(record),
      });
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  const result = await form!.submit({ name: "Ada" });

  assert.equal(result.success, true);
  assert.equal(calls.create, 1);
  assert.equal(calls.update, 0);
  assert.equal(created.length, 1);

  harness.cleanup();
});

test("useResourceForm updates the given id instead of creating a new record", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Old" }]);
  const harness = setupHarness(client);

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceForm<FakeRecord>(contact, { id: "1" });
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  const result = await form!.submit({ name: "Ada" });

  assert.equal(result.success, true);
  assert.equal(calls.update, 1);
  assert.equal(calls.create, 0);

  harness.cleanup();
});

test("useResourceForm's validation failure prevents any create/update call", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceForm<FakeRecord>(contact);
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  const result = await form!.submit({});

  assert.equal(result.success, false);
  assert.equal(calls.create, 0);

  harness.cleanup();
});

test("useResourceForm's isSubmitting reflects the underlying mutation while it's in flight", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);
  const unblock = block("create");

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceForm<FakeRecord>(contact);
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  assert.equal(form!.isSubmitting.value, false);
  assert.equal(form!.submitError.value, null);
  const pending = form!.submit({ name: "Ada" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(form!.isSubmitting.value, true);

  unblock();
  await pending;
  assert.equal(form!.isSubmitting.value, false);

  harness.cleanup();
});

test("useResourceForm's submitError surfaces a failed mutation", async () => {
  const { client, failNext } = createFakeClient([]);
  const harness = setupHarness(client);
  failNext.create = true;

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceForm<FakeRecord>(contact);
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  await assert.rejects(() => form!.submit({ name: "Ada" }));
  assert.ok(form!.submitError.value);

  harness.cleanup();
});
