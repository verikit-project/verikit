import assert from "node:assert/strict";
import test from "node:test";
import type { UseQueryReturnType } from "@tanstack/vue-query";
import { defineComponent, h } from "vue";
import {
  useListResource,
  useResourceFind,
  useResourceRelationship,
} from "../../src/query/index.js";
import { createFakeClient, setupHarness, waitFor } from "./fixtures.js";
import type { FakeRecord } from "./fixtures.js";

test("useListResource reaches success with the fake client's records", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  let captured: UseQueryReturnType<unknown, Error> | undefined;

  const Probe = defineComponent({
    setup() {
      captured = useListResource<FakeRecord>("posts");
      return () => h("div");
    },
  });

  harness.mountWithProvider(Probe);
  await waitFor(() => captured?.isSuccess.value === true);

  assert.equal(calls.list, 1);
  assert.deepEqual(
    (captured!.data.value as { records: FakeRecord[] }).records,
    [{ id: "1", title: "Hello" }],
  );

  harness.cleanup();
});

test("useListResource caches separately per params", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  let firstPage: UseQueryReturnType<unknown, Error> | undefined;
  let secondPage: UseQueryReturnType<unknown, Error> | undefined;

  const Probe = defineComponent({
    setup() {
      firstPage = useListResource<FakeRecord>("posts", { page: 1 });
      secondPage = useListResource<FakeRecord>("posts", { page: 2 });
      return () => h("div");
    },
  });

  harness.mountWithProvider(Probe);
  await waitFor(
    () =>
      firstPage?.isSuccess.value === true &&
      secondPage?.isSuccess.value === true,
  );

  assert.equal(calls.list, 2);

  harness.cleanup();
});

test("useResourceFind reaches success with a single record", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  let captured: UseQueryReturnType<FakeRecord, Error> | undefined;

  const Probe = defineComponent({
    setup() {
      captured = useResourceFind<FakeRecord>("posts", "1");
      return () => h("div");
    },
  });

  harness.mountWithProvider(Probe);
  await waitFor(() => captured?.isSuccess.value === true);

  assert.equal(calls.find, 1);
  assert.equal(captured!.data.value?.title, "Hello");

  harness.cleanup();
});

test("useResourceFind surfaces an error status when the record is missing", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);
  let captured: UseQueryReturnType<FakeRecord, Error> | undefined;

  const Probe = defineComponent({
    setup() {
      captured = useResourceFind<FakeRecord>("posts", "missing");
      return () => h("div");
    },
  });

  harness.mountWithProvider(Probe);
  await waitFor(() => captured?.isError.value === true);

  assert.match(captured!.error.value?.message ?? "", /Not found/);

  harness.cleanup();
});

test("useResourceRelationship reaches success with the picker's records", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);
  let captured: UseQueryReturnType<unknown, Error> | undefined;

  const Probe = defineComponent({
    setup() {
      captured = useResourceRelationship("posts", "author");
      return () => h("div");
    },
  });

  harness.mountWithProvider(Probe);
  await waitFor(() => captured?.isSuccess.value === true);

  assert.equal(calls.list, 1);

  harness.cleanup();
});

test("useResourceRelationship caches separately per relationship name", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);
  let author: UseQueryReturnType<unknown, Error> | undefined;
  let editor: UseQueryReturnType<unknown, Error> | undefined;

  const Probe = defineComponent({
    setup() {
      author = useResourceRelationship("posts", "author");
      editor = useResourceRelationship("posts", "editor");
      return () => h("div");
    },
  });

  harness.mountWithProvider(Probe);
  await waitFor(
    () => author?.isSuccess.value === true && editor?.isSuccess.value === true,
  );

  assert.equal(calls.list, 2);

  harness.cleanup();
});
