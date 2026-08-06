import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { defineResource, text } from "@verikit/core";
import { act } from "react";
import { installJsdom } from "../dom-setup.js";
import { useResourceTable } from "../../src/query/index.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "./fixtures.js";

const postResource = defineResource("posts", {
  fields: {
    title: text().required().sortable(),
    body: text().hidden(),
    status: text(),
  },
});

let uninstallJsdom: () => void;

before(() => {
  uninstallJsdom = installJsdom();
});

after(async () => {
  // Same zero-delay-eviction-timer reasoning as use-resource-mutations.test.tsx.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

test("useResourceTable derives one column per visible field, skipping hidden ones", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let result: ReturnType<typeof useResourceTable<FakeRecord>> | undefined;

  function Probe() {
    result = useResourceTable<FakeRecord>(postResource);
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => result!.isLoading === false);

  const headers = result!.table.getHeaderGroups()[0]?.headers;
  assert.deepEqual(
    headers?.map((header) => header.id),
    ["title", "status"],
  );
  // Only `title` was declared `.sortable()`; `status` reaches the same
  // column-mapping code with no explicit `sortable` flag, exercising its
  // `?? false` fallback.
  assert.equal(headers?.[0]?.column.getCanSort(), true);
  assert.equal(headers?.[1]?.column.getCanSort(), false);
  assert.deepEqual(
    result!.table.getRowModel().rows.map((row) => row.original.title),
    ["Hello"],
  );

  harness.cleanup();
});

test("useResourceTable's pagination controls drive the list request's page/pageSize", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  let result: ReturnType<typeof useResourceTable<FakeRecord>> | undefined;

  function Probe() {
    result = useResourceTable<FakeRecord>(postResource, { pageSize: 5 });
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => fixture.calls.list === 1);
  assert.deepEqual(fixture.lastListParams, {
    page: 1,
    pageSize: 5,
    search: undefined,
    sort: undefined,
  });

  await act(async () => {
    result!.table.setPageIndex(1);
  });

  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.page, 2);
  assert.equal(fixture.lastListParams?.pageSize, 5);

  harness.cleanup();
});

test("useResourceTable's sorting state drives the list request's sort param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  let result: ReturnType<typeof useResourceTable<FakeRecord>> | undefined;

  function Probe() {
    result = useResourceTable<FakeRecord>(postResource);
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => fixture.calls.list === 1);

  await act(async () => {
    result!.table.getColumn("title")?.toggleSorting(true);
  });

  await waitFor(() => fixture.calls.list === 2);
  assert.deepEqual(fixture.lastListParams?.sort, {
    field: "title",
    direction: "desc",
  });

  await act(async () => {
    result!.table.getColumn("title")?.toggleSorting(false);
  });

  await waitFor(() => fixture.calls.list === 3);
  assert.deepEqual(fixture.lastListParams?.sort, {
    field: "title",
    direction: "asc",
  });

  harness.cleanup();
});

test("useResourceTable's global filter drives the list request's search param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  let result: ReturnType<typeof useResourceTable<FakeRecord>> | undefined;

  function Probe() {
    result = useResourceTable<FakeRecord>(postResource);
    return null;
  }

  await harness.render(<Probe />);
  await waitFor(() => fixture.calls.list === 1);

  await act(async () => {
    result!.table.setGlobalFilter("hello");
  });

  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.search, "hello");

  harness.cleanup();
});

test("useResourceTable surfaces loading/fetching/error state from the underlying query", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);

  let result: ReturnType<typeof useResourceTable<FakeRecord>> | undefined;

  function Probe() {
    result = useResourceTable<FakeRecord>(postResource);
    return null;
  }

  const release = block("list");

  await harness.render(<Probe />);
  assert.equal(result!.isLoading, true);
  assert.equal(result!.isFetching, true);
  assert.equal(result!.error, null);

  release();
  await waitFor(() => result!.isLoading === false);
  assert.equal(result!.isFetching, false);

  harness.cleanup();
});
