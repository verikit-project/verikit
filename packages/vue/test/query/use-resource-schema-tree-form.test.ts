import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { defineComponent, h } from "vue";
import { useResourceSchemaTreeForm } from "../../src/query/index.js";
import { createFakeClient, setupHarness } from "./fixtures.js";
import type { FakeRecord } from "./fixtures.js";

const contact = defineResource("Contact", {
  fields: {
    name: text().required(),
  },
}).form((f) => [f.field("name")]);

test("useResourceSchemaTreeForm creates a record with no id, and reports it via onSuccess", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);
  const created: unknown[] = [];

  let form:
    ReturnType<typeof useResourceSchemaTreeForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceSchemaTreeForm<FakeRecord>(contact, {
        onSuccess: (record) => created.push(record),
      });
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  assert.equal(form!.isSubmitting.value, false);
  assert.equal(form!.submitError.value, null);
  const result = await form!.submit({ name: "Ada" });

  assert.equal(result.success, true);
  assert.equal(calls.create, 1);
  assert.equal(created.length, 1);

  harness.cleanup();
});

test("useResourceSchemaTreeForm updates the given id instead of creating a new record", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Old" }]);
  const harness = setupHarness(client);

  let form:
    ReturnType<typeof useResourceSchemaTreeForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceSchemaTreeForm<FakeRecord>(contact, { id: "1" });
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  const result = await form!.submit({ name: "Ada" });

  assert.equal(result.success, true);
  assert.equal(calls.update, 1);

  harness.cleanup();
});

test("a structured server validation error maps onto the form's field errors", async () => {
  const { client, failNext } = createFakeClient([]);
  const harness = setupHarness(client);
  failNext.create = new VerikitClientError(
    400,
    "Validation failed",
    "VALIDATION_ERROR",
    { issues: [{ path: ["name"], message: "Already taken" }] },
  );

  let form:
    ReturnType<typeof useResourceSchemaTreeForm<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      form = useResourceSchemaTreeForm<FakeRecord>(contact);
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);

  await assert.rejects(() => form!.submit({ name: "Ada" }));
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(form!.fieldErrors.value.name, ["Already taken"]);

  harness.cleanup();
});
