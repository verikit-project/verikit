import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h } from "vue";
import {
  useActionResource,
  useCreateResource,
  useDeleteResource,
  useListResource,
  useResourceFind,
  useUpdateResource,
} from "../../src/query/index.js";
import { createFakeClient, setupHarness, waitFor } from "./fixtures.js";
import type { FakeRecord } from "./fixtures.js";

function mountCaptured<T>(
  harness: ReturnType<typeof setupHarness>,
  factory: () => T,
): T {
  let captured: T;
  const Probe = defineComponent({
    setup() {
      captured = factory();
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);
  return captured!;
}

test("useCreateResource creates a record, invalidates lists, and forwards a caller-supplied onSuccess", async () => {
  const { client, calls, records } = createFakeClient([]);
  const harness = setupHarness(client);
  harness.queryClient.setQueryData(["verikit", "posts", "list", {}], {
    records: [],
    total: 0,
    page: 1,
    pageSize: 25,
  });
  const onSuccessCalls: unknown[] = [];

  const mutation = mountCaptured(harness, () =>
    useCreateResource<FakeRecord>("posts", {
      onSuccess: (record) => onSuccessCalls.push(record),
    }),
  );

  await mutation.mutateAsync({ title: "New" });

  assert.equal(calls.create, 1);
  assert.equal(records.length, 1);
  assert.equal(onSuccessCalls.length, 1);
  assert.equal(
    harness.queryClient.getQueryState(["verikit", "posts", "list", {}])
      ?.isInvalidated,
    true,
  );

  harness.cleanup();
});

test("useUpdateResource applies its optimistic merge to the cache before the network call resolves", async () => {
  const { client, block } = createFakeClient([{ id: "1", title: "Old" }]);
  const harness = setupHarness(client);

  // Active `useListResource`/`useResourceFind` observers, not a bare
  // `setQueryData` poke, keep the cache entries alive against `gcTime: 0`
  // once the mutation starts, and give the optimistic list-row patch a
  // cached list row to actually match against.
  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let mutation: ReturnType<typeof useUpdateResource<FakeRecord>> | undefined;
  const onMutateCalls: string[] = [];
  const onSettledCalls: unknown[] = [];
  const Probe = defineComponent({
    setup() {
      list = useListResource<FakeRecord>("posts");
      find = useResourceFind<FakeRecord>("posts", "1");
      mutation = useUpdateResource<FakeRecord>("posts", {
        onMutate: (variables) => {
          onMutateCalls.push(variables.id);
        },
        onSettled: (data) => {
          onSettledCalls.push(data);
        },
      });
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);
  await waitFor(
    () => list?.isSuccess.value === true && find?.isSuccess.value === true,
  );

  const unblock = block("update");
  const pending = mutation!.mutateAsync({ id: "1", input: { title: "New" } });

  // The fake "server" call is blocked, so this can only be the optimistic write.
  await waitFor(
    () =>
      (
        harness.queryClient.getQueryData(["verikit", "posts", "find", "1"]) as
          FakeRecord | undefined
      )?.title === "New",
  );
  assert.deepEqual(onMutateCalls, ["1"]);
  assert.equal(
    (
      harness.queryClient.getQueryData(["verikit", "posts", "list", {}]) as {
        records: FakeRecord[];
      }
    ).records[0]?.title,
    "New",
  );

  unblock();
  await pending;
  assert.equal(onSettledCalls.length, 1);
  harness.cleanup();
});

test("useUpdateResource rolls back its optimistic merge when the mutation fails", async () => {
  const { client, failNext } = createFakeClient([{ id: "1", title: "Old" }]);
  const harness = setupHarness(client);
  harness.queryClient.setQueryData(["verikit", "posts", "find", "1"], {
    id: "1",
    title: "Old",
  });
  failNext.update = true;
  const onErrorCalls: unknown[] = [];
  const onSettledCalls: unknown[] = [];

  const mutation = mountCaptured(harness, () =>
    useUpdateResource<FakeRecord>("posts", {
      onError: (error) => onErrorCalls.push(error),
      onSettled: (data, error) => onSettledCalls.push(error ?? data),
    }),
  );

  await assert.rejects(() =>
    mutation.mutateAsync({ id: "1", input: { title: "New" } }),
  );
  await waitFor(() => mutation.isError.value === true);

  assert.equal(
    (
      harness.queryClient.getQueryData([
        "verikit",
        "posts",
        "find",
        "1",
      ]) as FakeRecord
    ).title,
    "Old",
  );
  assert.equal(onErrorCalls.length, 1);
  assert.equal(onSettledCalls.length, 1);

  harness.cleanup();
});

test("useDeleteResource deletes a record and evicts its find(id) cache entry", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  harness.queryClient.setQueryData(["verikit", "posts", "find", "1"], {
    id: "1",
    title: "Hello",
  });
  const onMutateCalls: string[] = [];
  const onSuccessCalls: string[] = [];
  const onSettledCalls: unknown[] = [];

  const mutation = mountCaptured(harness, () =>
    useDeleteResource("posts", {
      onMutate: (id) => onMutateCalls.push(id),
      onSuccess: (_data, id) => onSuccessCalls.push(id),
      onSettled: (_data, error) => onSettledCalls.push(error),
    }),
  );

  await mutation.mutateAsync("1");

  assert.equal(calls.delete, 1);
  assert.equal(
    harness.queryClient.getQueryData(["verikit", "posts", "find", "1"]),
    undefined,
  );
  assert.deepEqual(onMutateCalls, ["1"]);
  assert.deepEqual(onSuccessCalls, ["1"]);
  assert.equal(onSettledCalls.length, 1);

  harness.cleanup();
});

test("useDeleteResource rolls back its optimistic removal when the mutation fails", async () => {
  const { client, failNext } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  harness.queryClient.setQueryData(["verikit", "posts", "list", {}], {
    records: [{ id: "1", title: "Hello" }],
    total: 1,
    page: 1,
    pageSize: 25,
  });
  failNext.delete = true;
  const onErrorCalls: unknown[] = [];

  const mutation = mountCaptured(harness, () =>
    useDeleteResource("posts", {
      onError: (error) => onErrorCalls.push(error),
    }),
  );

  await assert.rejects(() => mutation.mutateAsync("1"));
  await waitFor(() => mutation.isError.value === true);

  assert.deepEqual(
    (
      harness.queryClient.getQueryData(["verikit", "posts", "list", {}]) as {
        records: FakeRecord[];
      }
    ).records,
    [{ id: "1", title: "Hello" }],
  );
  assert.equal(onErrorCalls.length, 1);

  harness.cleanup();
});

test("useActionResource runs a named action, invalidates cached queries, and forwards a caller-supplied onSuccess", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);
  const onSuccessCalls: unknown[] = [];

  const mutation = mountCaptured(harness, () =>
    useActionResource("posts", "publish", {
      onSuccess: (result) => onSuccessCalls.push(result),
    }),
  );

  const result = await mutation.mutateAsync({ input: { note: "Ready" } });

  assert.equal(calls.action, 1);
  assert.deepEqual(
    (result as { result: { actionName: string } }).result.actionName,
    "publish",
  );
  assert.equal(onSuccessCalls.length, 1);

  harness.cleanup();
});
