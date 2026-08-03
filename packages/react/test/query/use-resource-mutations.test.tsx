import assert from "node:assert/strict";
import { after, before, test } from "node:test";
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
