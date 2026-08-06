import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { ListResponse } from "@verikit/client";
import { act } from "react";
import { installJsdom } from "../dom-setup.js";
import {
  useCreateResource,
  useDeleteResource,
  useActionResource,
  useResourceFind,
  useListResource,
  useUpdateResource,
} from "../../src/query/index.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "./fixtures.js";

const findKey = (id: string) => ["verikit", "posts", "find", id];
const listKey = ["verikit", "posts", "list", {}];

let uninstallJsdom: () => void;

before(() => {
  uninstallJsdom = installJsdom();
});

after(async () => {
  // React Query schedules cache eviction via a zero-delay timer even with
  // `gcTime: 0`; give it a moment to fire against real jsdom globals before
  // tearing them down, or it throws trying to run after they're gone.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

test("useCreateResource creates a record and invalidates the resource's list queries", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let create: ReturnType<typeof useCreateResource<FakeRecord>> | undefined;
  const onSuccessCalls: FakeRecord[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    create = useCreateResource<FakeRecord>("posts", {
      onSuccess: (record) => onSuccessCalls.push(record),
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success");
  assert.equal(calls.list, 1);

  const created = await act(async () => create!.mutateAsync({ title: "New" }));
  assert.equal(created.title, "New");
  assert.equal(calls.create, 1);
  assert.deepEqual(onSuccessCalls, [created]);

  await waitFor(() => calls.list === 2);

  harness.cleanup();
});

test("useUpdateResource updates a record and invalidates its list and find(id) queries", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let update: ReturnType<typeof useUpdateResource<FakeRecord>> | undefined;
  const onSuccessCalls: FakeRecord[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    update = useUpdateResource<FakeRecord>("posts", {
      onSuccess: (record) => onSuccessCalls.push(record),
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");
  assert.equal(calls.list, 1);
  assert.equal(calls.find, 1);

  const updated = await act(async () =>
    update!.mutateAsync({ id: "1", input: { title: "Changed" } }),
  );
  assert.equal(updated.title, "Changed");
  assert.equal(calls.update, 1);
  assert.deepEqual(onSuccessCalls, [updated]);

  await waitFor(() => calls.list === 2 && calls.find === 2);

  harness.cleanup();
});

test("useUpdateResource applies its optimistic merge to the cache before the network call resolves", async () => {
  const { client, block } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let update: ReturnType<typeof useUpdateResource<FakeRecord>> | undefined;
  const onMutateCalls: string[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    update = useUpdateResource<FakeRecord>("posts", {
      onMutate: (variables) => {
        onMutateCalls.push(variables.id);
      },
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");

  const release = block("update");
  let pending: Promise<FakeRecord> | undefined;

  await act(() => {
    pending = update!.mutateAsync({ id: "1", input: { title: "Optimistic" } });
  });

  // The fake "server" call is blocked, so this can only be the optimistic write.
  await waitFor(
    () =>
      harness.queryClient.getQueryData<FakeRecord>(findKey("1"))?.title ===
      "Optimistic",
  );
  assert.equal(
    harness.queryClient.getQueryData<ListResponse<FakeRecord>>(listKey)
      ?.records[0]?.title,
    "Optimistic",
  );

  release();
  await act(async () => {
    await pending;
  });

  assert.deepEqual(onMutateCalls, ["1"]);

  harness.cleanup();
});

test("useUpdateResource merging into an uncached find(id) is a no-op (nothing to merge into)", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let update: ReturnType<typeof useUpdateResource<FakeRecord>> | undefined;

  function Probe() {
    // No useResourceFind("1") mounted, so keys.find("1") starts uncached.
    update = useUpdateResource<FakeRecord>("posts");
    return null;
  }

  await harness.render(<Probe />);

  const updated = await act(async () =>
    update!.mutateAsync({ id: "1", input: { title: "Changed" } }),
  );
  assert.equal(updated.title, "Changed");
  assert.equal(
    harness.queryClient.getQueryData(["verikit", "posts", "find", "1"]),
    undefined,
  );

  harness.cleanup();
});

test("useUpdateResource rolls back its optimistic merge when the mutation fails", async () => {
  const { client, calls, failNext } = createFakeClient([
    { id: "1", title: "Hello" },
  ]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let update: ReturnType<typeof useUpdateResource<FakeRecord>> | undefined;
  const onErrorCalls: string[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    update = useUpdateResource<FakeRecord>("posts", {
      onError: (_error, variables) => {
        onErrorCalls.push(variables.id);
      },
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");

  failNext.update = true;
  await act(async () => {
    await assert.rejects(() =>
      update!.mutateAsync({ id: "1", input: { title: "Will fail" } }),
    );
  });

  assert.equal(calls.update, 1);
  assert.deepEqual(onErrorCalls, ["1"]);
  assert.equal(
    harness.queryClient.getQueryData<FakeRecord>(findKey("1"))?.title,
    "Hello",
  );
  assert.equal(
    harness.queryClient.getQueryData<ListResponse<FakeRecord>>(listKey)
      ?.records[0]?.title,
    "Hello",
  );

  harness.cleanup();
});

test("useUpdateResource's failed rollback is followed by a forced refetch, so a stale snapshot can't be the final word", async () => {
  const { client, calls, failNext } = createFakeClient([
    { id: "1", title: "Hello" },
  ]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let update: ReturnType<typeof useUpdateResource<FakeRecord>> | undefined;
  const onSettledCalls: unknown[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    update = useUpdateResource<FakeRecord>("posts", {
      onSettled: (data, error, variables) =>
        onSettledCalls.push({ data, hasError: error !== null, variables }),
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");
  assert.equal(calls.list, 1);
  assert.equal(calls.find, 1);

  failNext.update = true;
  await act(async () => {
    await assert.rejects(() =>
      update!.mutateAsync({ id: "1", input: { title: "Will fail" } }),
    );
  });

  // onError's rollback only writes the pre-mutation snapshot back into the
  // cache (no network call)  it can't tell whether that snapshot is still
  // current. Without a forced refetch on settle, a background write that
  // landed while this mutation was in flight would stay silently reverted.
  // Asserting the query re-fetches (not just that its value looks right) is
  // what actually distinguishes the fix from onError's rollback alone.
  await waitFor(() => calls.find === 2 && calls.list === 2);
  assert.equal(
    harness.queryClient.getQueryData<FakeRecord>(findKey("1"))?.title,
    "Hello",
  );
  assert.deepEqual(onSettledCalls, [
    {
      data: undefined,
      hasError: true,
      variables: { id: "1", input: { title: "Will fail" } },
    },
  ]);

  harness.cleanup();
});

test("useDeleteResource deletes a record, invalidates lists, and removes (not just invalidates) its find(id) cache entry", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let del: ReturnType<typeof useDeleteResource> | undefined;
  const onSuccessCalls: string[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    del = useDeleteResource("posts", {
      onSuccess: (_data, id) => onSuccessCalls.push(id),
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");
  assert.equal(calls.list, 1);
  assert.deepEqual(
    harness.queryClient.getQueryData(["verikit", "posts", "find", "1"]),
    {
      id: "1",
      title: "Hello",
    },
  );

  await act(async () => del!.mutateAsync("1"));
  assert.equal(calls.delete, 1);
  assert.deepEqual(onSuccessCalls, ["1"]);

  // Removed outright, unlike invalidateQueries (which would leave the old
  // record momentarily readable via getQueryData while marked stale).
  assert.equal(
    harness.queryClient.getQueryData(["verikit", "posts", "find", "1"]),
    undefined,
  );

  await waitFor(() => calls.list === 2);

  harness.cleanup();
});

test("useDeleteResource optimistically removes the record from cache before the network call resolves", async () => {
  const { client, block } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let del: ReturnType<typeof useDeleteResource> | undefined;
  const onMutateCalls: string[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    del = useDeleteResource("posts", {
      onMutate: (id) => {
        onMutateCalls.push(id);
      },
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");

  // `find("1")` is actively mounted, so removing its cache entry would
  // otherwise trigger an immediate auto-refetch that repopulates it before
  // this test can observe the optimistic removal  block that path too.
  const releaseDelete = block("delete");
  const releaseFind = block("find");
  let pending: Promise<void> | undefined;

  await act(() => {
    pending = del!.mutateAsync("1");
  });

  // The fake "server" call is blocked, so this can only be the optimistic removal.
  await waitFor(
    () =>
      harness.queryClient.getQueryData<ListResponse<FakeRecord>>(listKey)
        ?.records.length === 0,
  );
  assert.equal(harness.queryClient.getQueryData(findKey("1")), undefined);

  releaseDelete();
  releaseFind();
  await act(async () => {
    await pending;
  });

  assert.deepEqual(onMutateCalls, ["1"]);

  harness.cleanup();
});

test("useDeleteResource rolls back its optimistic removal when the mutation fails", async () => {
  const { client, calls, failNext } = createFakeClient([
    { id: "1", title: "Hello" },
  ]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let del: ReturnType<typeof useDeleteResource> | undefined;
  const onErrorCalls: string[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    del = useDeleteResource("posts", {
      onError: (_error, id) => {
        onErrorCalls.push(id);
      },
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");

  failNext.delete = true;
  await act(async () => {
    await assert.rejects(() => del!.mutateAsync("1"));
  });

  assert.equal(calls.delete, 1);
  assert.deepEqual(onErrorCalls, ["1"]);
  assert.deepEqual(harness.queryClient.getQueryData<FakeRecord>(findKey("1")), {
    id: "1",
    title: "Hello",
  });
  assert.equal(
    harness.queryClient.getQueryData<ListResponse<FakeRecord>>(listKey)?.records
      .length,
    1,
  );

  harness.cleanup();
});

test("useDeleteResource's failed rollback is followed by a forced refetch, so a stale snapshot can't be the final word", async () => {
  const { client, calls, failNext } = createFakeClient([
    { id: "1", title: "Hello" },
  ]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let del: ReturnType<typeof useDeleteResource> | undefined;
  const onSettledCalls: unknown[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    find = useResourceFind<FakeRecord>("posts", "1");
    del = useDeleteResource("posts", {
      onSettled: (data, error, id) =>
        onSettledCalls.push({ data, hasError: error !== null, id }),
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success" && find?.status === "success");
  assert.equal(calls.list, 1);
  assert.equal(calls.find, 1);

  failNext.delete = true;
  await act(async () => {
    await assert.rejects(() => del!.mutateAsync("1"));
  });

  // Same reasoning as update's rollback: onError only replays the
  // pre-mutation snapshot into the cache, with no way to know whether
  // something fresher landed while the delete was in flight. The forced
  // refetch on settle is what a rollback alone can't provide.
  await waitFor(() => calls.find === 2 && calls.list === 2);
  assert.deepEqual(harness.queryClient.getQueryData<FakeRecord>(findKey("1")), {
    id: "1",
    title: "Hello",
  });
  assert.deepEqual(onSettledCalls, [
    { data: undefined, hasError: true, id: "1" },
  ]);

  harness.cleanup();
});

test("useCreateResource leaves the cache untouched while the mutation is in flight (no built-in optimism)", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let create: ReturnType<typeof useCreateResource<FakeRecord>> | undefined;

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    create = useCreateResource<FakeRecord>("posts");
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success");

  const release = block("create");
  let pending: Promise<FakeRecord> | undefined;

  await act(() => {
    pending = create!.mutateAsync({ title: "New" });
  });

  // Give any (hypothetical) optimistic write a chance to land, then confirm
  // the blocked "server" call is genuinely the only thing still pending.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  assert.deepEqual(
    harness.queryClient.getQueryData<ListResponse<FakeRecord>>(listKey)
      ?.records,
    [],
  );

  release();
  await act(async () => {
    await pending;
  });

  harness.cleanup();
});

test("useActionResource leaves the cache untouched while the mutation is in flight (no built-in optimism)", async () => {
  const { client, block } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let find: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;
  let action:
    ReturnType<typeof useActionResource<{ actionName: string }>> | undefined;

  function Probe() {
    find = useResourceFind<FakeRecord>("posts", "1");
    action = useActionResource<{ actionName: string }>("posts", "publish");
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => find?.status === "success");

  const release = block("action");
  let pending: Promise<{ result: { actionName: string } }> | undefined;

  await act(() => {
    pending = action!.mutateAsync({ recordId: "1" });
  });

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  assert.deepEqual(harness.queryClient.getQueryData<FakeRecord>(findKey("1")), {
    id: "1",
    title: "Hello",
  });

  release();
  await act(async () => {
    await pending;
  });

  harness.cleanup();
});

test("useActionResource runs a named action and invalidates the resource's cached queries", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let list: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let action:
    ReturnType<typeof useActionResource<{ actionName: string }>> | undefined;
  const onSuccessCalls: string[] = [];

  function Probe() {
    list = useListResource<FakeRecord>("posts");
    action = useActionResource<{ actionName: string }>("posts", "publish", {
      onSuccess: (result) => onSuccessCalls.push(result.result.actionName),
    });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => list?.status === "success");
  assert.equal(calls.list, 1);

  const result = await act(async () =>
    action!.mutateAsync({ recordId: "1", confirmed: true }),
  );
  assert.equal(result.result.actionName, "publish");
  assert.equal(calls.action, 1);
  assert.deepEqual(onSuccessCalls, ["publish"]);

  await waitFor(() => calls.list === 2);

  harness.cleanup();
});
