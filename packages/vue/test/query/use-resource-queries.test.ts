import { createClient } from "@verikit/client";
import { VerikitProvider } from "../../src/client/index.js";
import { mount } from "@vue/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { useUpdateResource } from "../../src/query/index.js";
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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Probe = defineComponent({
    setup() {
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
      return () =>
        h(
          "span",
          [
            list.data.value?.records[0]?.title,
            find.data.value?.title,
            relationship.data.value?.records[0]?.title,
          ].join("/"),
        );
    },
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h("div", [
          h(VerikitProvider, { client: a, queryClient }, () => h(Probe)),
          h(VerikitProvider, { client: b, queryClient }, () => h(Probe)),
        ]),
    }),
  );
  try {
    await waitFor(() => wrapper.text() === "Alice/Alice/AliceBob/Bob/Bob");
  } finally {
    wrapper.unmount();
    queryClient.clear();
  }
});

test("identity replacement resets descendants and confines a late mutation rollback", async () => {
  const a = createFakeClient([{ id: "1", title: "Alice" }]);
  const b = createFakeClient([{ id: "1", title: "Bob" }]);
  const clientA = { ...a.client, cacheNamespace: "session-a" };
  const clientB = { ...b.client, cacheNamespace: "session-b" };
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  let update: ReturnType<typeof useUpdateResource<FakeRecord>>;
  let mounts = 0;
  const Probe = defineComponent({
    setup() {
      const generation = ++mounts;
      const list = useListResource<FakeRecord>(
        "posts",
        {},
        { staleTime: Infinity },
      );
      update = useUpdateResource<FakeRecord>("posts");
      return () =>
        h("span", `${generation}:${list.data.value?.records[0]?.title ?? ""}`);
    },
  });
  const wrapper = mount(VerikitProvider, {
    props: { client: clientA, queryClient },
    slots: { default: () => h(Probe) },
  });
  const release = a.block("update");
  try {
    await waitFor(() => wrapper.text() === "1:Alice");
    a.failNext.update = true;
    const pending = update!
      .mutateAsync({ id: "1", input: { title: "pending" } })
      .catch(() => {});
    await waitFor(() => a.calls.update === 1);
    await wrapper.setProps({ client: clientB });
    await waitFor(() => wrapper.text() === "2:Bob");
    release();
    await pending;
    assert.equal(wrapper.text(), "2:Bob");
    assert.equal(b.calls.list, 1);
  } finally {
    release();
    wrapper.unmount();
    queryClient.clear();
  }
});
