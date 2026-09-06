import { createClient } from "@verikit/client";
import { VerikitProvider } from "../../src/client/index.js";
import { useState } from "react";
import { useUpdateResource } from "../../src/query/index.js";
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

test("shared QueryClient isolates list, find and relationship reads by client", async () => {
  const clientFor = (title: string) =>
    createClient({
      baseUrl: "/api",
      fetch: (async (url) =>
        Response.json({
          data: String(url).endsWith("/1")
            ? { id: "1", title }
            : [{ id: "1", title }],
          meta: { total: 1, page: 1, pageSize: 25 },
        })) as typeof fetch,
    });
  const a = clientFor("Alice");
  const b = clientFor("Bob");
  const harness = setupHarness(a);
  function Probe() {
    const list = useListResource<FakeRecord>(
      "posts",
      {},
      { staleTime: Infinity },
    );
    const find = useResourceFind<FakeRecord>("posts", "1", {
      staleTime: Infinity,
    });
    const relationship = useResourceRelationship<FakeRecord>(
      "posts",
      "author",
      {},
      { staleTime: Infinity },
    );
    return (
      <span>
        {[
          list.data?.records[0]?.title,
          find.data?.title,
          relationship.data?.records[0]?.title,
        ].join("/")}
      </span>
    );
  }
  try {
    await harness.render(
      <>
        <Probe />
        <VerikitProvider client={b} queryClient={harness.queryClient}>
          <Probe />
        </VerikitProvider>
      </>,
    );
    await waitFor(
      () => harness.container.textContent === "Alice/Alice/AliceBob/Bob/Bob",
    );
  } finally {
    harness.cleanup();
  }
});

test("identity replacement resets descendants and confines a late mutation rollback", async () => {
  const a = createFakeClient([{ id: "1", title: "Alice" }]);
  const b = createFakeClient([{ id: "1", title: "Bob" }]);
  const clientA = { ...a.client, cacheNamespace: "session-a" };
  const clientB = { ...b.client, cacheNamespace: "session-b" };
  const harness = setupHarness(clientA);
  let update: ReturnType<typeof useUpdateResource<FakeRecord>>;
  let mounts = 0;
  function Probe() {
    const [mount] = useState(() => ++mounts);
    const list = useListResource<FakeRecord>(
      "posts",
      {},
      { staleTime: Infinity },
    );
    update = useUpdateResource<FakeRecord>("posts");
    return (
      <span>
        {mount}:{list.data?.records[0]?.title}
      </span>
    );
  }
  const render = (client: typeof clientA) =>
    harness.render(
      <VerikitProvider client={client} queryClient={harness.queryClient}>
        <Probe />
      </VerikitProvider>,
    );
  const release = a.block("update");
  try {
    await render(clientA);
    await waitFor(() => harness.container.textContent === "1:Alice");
    a.failNext.update = true;
    const pending = update!
      .mutateAsync({ id: "1", input: { title: "pending" } })
      .catch(() => {});
    await waitFor(() => a.calls.update === 1);
    await render(clientB);
    await waitFor(() => harness.container.textContent === "2:Bob");
    release();
    await pending;
    assert.equal(harness.container.textContent, "2:Bob");
    assert.equal(b.calls.list, 1);
  } finally {
    release();
    harness.cleanup();
  }
});
