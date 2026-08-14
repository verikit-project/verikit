import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { installJsdom } from "../dom-setup.js";
import {
  useResourceFind,
  useListResource,
  useResourceRelationship,
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

test("useListResource reaches success with the fake client's records", async () => {
  const { client, calls } = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  const harness = setupHarness(client);

  let captured: ReturnType<typeof useListResource<FakeRecord>> | undefined;

  function Probe() {
    captured = useListResource<FakeRecord>("posts");
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => captured?.status === "success");

  assert.equal(calls.list, 1);
  assert.equal(captured?.data?.records.length, 2);
  assert.equal(captured?.data?.total, 2);

  harness.cleanup();
});

test("useListResource caches separately per params", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let a: ReturnType<typeof useListResource<FakeRecord>> | undefined;
  let b: ReturnType<typeof useListResource<FakeRecord>> | undefined;

  function Probe() {
    a = useListResource<FakeRecord>("posts", { page: 1 });
    b = useListResource<FakeRecord>("posts", { page: 2 });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => a?.status === "success" && b?.status === "success");

  assert.equal(calls.list, 2);

  harness.cleanup();
});

test("useResourceFind reaches success with a single record", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let captured: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;

  function Probe() {
    captured = useResourceFind<FakeRecord>("posts", "1");
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => captured?.status === "success");

  assert.equal(calls.find, 1);
  assert.equal(captured?.data?.title, "Hello");

  harness.cleanup();
});

test("useResourceFind surfaces an error status when the record is missing", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  let captured: ReturnType<typeof useResourceFind<FakeRecord>> | undefined;

  function Probe() {
    captured = useResourceFind<FakeRecord>("posts", "missing");
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => captured?.status === "error");

  assert.match(captured!.error!.message, /Not found/);

  harness.cleanup();
});

test("useResourceRelationship reaches success with the picker's records", async () => {
  const { client, calls } = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(client);

  let captured:
    ReturnType<typeof useResourceRelationship<FakeRecord>> | undefined;

  function Probe() {
    captured = useResourceRelationship<FakeRecord>("posts", "author");
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => captured?.status === "success");

  // The fake client's `relationship()` delegates to `list()`.
  assert.equal(calls.list, 1);
  assert.equal(captured?.data?.records.length, 2);

  harness.cleanup();
});

test("useResourceRelationship caches separately per relationship name", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);

  let a: ReturnType<typeof useResourceRelationship<FakeRecord>> | undefined;
  let b: ReturnType<typeof useResourceRelationship<FakeRecord>> | undefined;

  function Probe() {
    a = useResourceRelationship<FakeRecord>("posts", "author");
    b = useResourceRelationship<FakeRecord>("posts", "editor");
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => a?.status === "success" && b?.status === "success");

  assert.equal(calls.list, 2);

  harness.cleanup();
});
