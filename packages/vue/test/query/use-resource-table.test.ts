import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text } from "@verikit/core";
import { defineComponent, h } from "vue";
import { useResourceTable } from "../../src/query/use-resource-table.js";
import { createFakeClient, setupHarness, waitFor } from "./fixtures.js";
import type { FakeRecord } from "./fixtures.js";

const postResource = defineResource("posts", {
  fields: {
    title: text().required().sortable(),
    body: text().hidden(),
    status: text(),
  },
});

function mountTable(
  harness: ReturnType<typeof setupHarness>,
  resource: Parameters<typeof useResourceTable>[0] = postResource,
  options?: Parameters<typeof useResourceTable>[1],
) {
  let result: ReturnType<typeof useResourceTable<FakeRecord>> | undefined;
  const Probe = defineComponent({
    setup() {
      result = useResourceTable<FakeRecord>(resource, options);
      return () => h("div");
    },
  });
  harness.mountWithProvider(Probe);
  return () => result!;
}

test("useResourceTable derives one column per visible field, skipping hidden ones", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  const result = mountTable(harness);

  await waitFor(() => result().isLoading.value === false);

  const headers = result().table.getHeaderGroups()[0]?.headers;
  assert.deepEqual(headers?.map((header) => header.id), ["title", "status"]);
  assert.equal(headers?.[0]?.column.getCanSort(), true);
  assert.equal(headers?.[1]?.column.getCanSort(), false);
  assert.deepEqual(
    result().table.getRowModel().rows.map((row) => row.original.title),
    ["Hello"],
  );

  harness.cleanup();
});

test("useResourceTable skips tableHidden fields as columns", async () => {
  const resourceWithTableHidden = defineResource("notes", {
    fields: {
      title: text().required(),
      internalNote: text().tableHidden(),
    },
  });
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  const result = mountTable(harness, resourceWithTableHidden);

  await waitFor(() => result().isLoading.value === false);

  const headers = result().table.getHeaderGroups()[0]?.headers;
  assert.deepEqual(headers?.map((header) => header.id), ["title"]);

  harness.cleanup();
});

test("useResourceTable's pagination controls drive the list request's page/pageSize", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const result = mountTable(harness, postResource, { pageSize: 5 });

  await waitFor(() => fixture.calls.list === 1);
  assert.deepEqual(fixture.lastListParams, {
    page: 1,
    pageSize: 5,
    search: undefined,
    sort: undefined,
  });

  result().table.setPageIndex(1);

  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.page, 2);
  assert.equal(fixture.lastListParams?.pageSize, 5);

  harness.cleanup();
});

test("useResourceTable's sorting state drives the list request's sort param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const result = mountTable(harness);

  await waitFor(() => fixture.calls.list === 1);

  result().table.getColumn("title")?.toggleSorting(true);

  await waitFor(() => fixture.calls.list === 2);
  assert.deepEqual(fixture.lastListParams?.sort, { field: "title", direction: "desc" });

  result().table.getColumn("title")?.toggleSorting(false);

  await waitFor(() => fixture.calls.list === 3);
  assert.deepEqual(fixture.lastListParams?.sort, { field: "title", direction: "asc" });

  harness.cleanup();
});

test("useResourceTable's global filter drives the list request's search param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const result = mountTable(harness);

  await waitFor(() => fixture.calls.list === 1);

  result().table.setGlobalFilter("hello");

  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.search, "hello");

  harness.cleanup();
});

test("useResourceTable resets to the first page when the global filter changes", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const result = mountTable(harness);

  await waitFor(() => fixture.calls.list === 1);

  result().table.setPageIndex(1);
  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.page, 2);

  result().table.setGlobalFilter("hello");

  await waitFor(() => fixture.calls.list === 3);
  assert.equal(fixture.lastListParams?.page, 1);
  assert.equal(fixture.lastListParams?.search, "hello");

  harness.cleanup();
});

test("useResourceTable's filters state drives the list request's filters param", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const result = mountTable(harness);

  await waitFor(() => fixture.calls.list === 1);
  assert.equal(fixture.lastListParams?.filters, undefined);

  result().setFilters({ title: { eq: "Hello" } });

  await waitFor(() => fixture.calls.list === 2);
  assert.deepEqual(fixture.lastListParams?.filters, { title: { eq: "Hello" } });
  assert.deepEqual(result().filters.value, { title: { eq: "Hello" } });

  harness.cleanup();
});

test("useResourceTable resets to the first page when filters change", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);
  const result = mountTable(harness);

  await waitFor(() => fixture.calls.list === 1);

  result().table.setPageIndex(1);
  await waitFor(() => fixture.calls.list === 2);
  assert.equal(fixture.lastListParams?.page, 2);

  result().setFilters({ title: { eq: "Hello" } });

  await waitFor(() => fixture.calls.list === 3);
  assert.equal(fixture.lastListParams?.page, 1);
  assert.deepEqual(fixture.lastListParams?.filters, { title: { eq: "Hello" } });

  harness.cleanup();
});

test("useResourceTable resolves and exposes the source's field schemas", async () => {
  const { client } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);
  const result = mountTable(harness);

  await waitFor(() => result().isLoading.value === false);

  assert.deepEqual(Object.keys(result().fields), ["title", "body", "status"]);
  assert.equal(result().fields.title?.fieldType, "text");

  harness.cleanup();
});

test("useResourceTable's row selection state selects and deselects rows by their record id, not position", async () => {
  const { client } = createFakeClient([
    { id: "1", title: "One" },
    { id: "2", title: "Two" },
  ]);
  const harness = setupHarness(client);
  const result = mountTable(harness);

  await waitFor(() => result().isLoading.value === false);

  result().table.getRowModel().rows[0]!.toggleSelected(true);
  await waitFor(
    () => result().table.getSelectedRowModel().rows.map((row) => row.original.id).length === 1,
  );
  assert.deepEqual(
    result().table.getSelectedRowModel().rows.map((row) => row.original.id),
    ["1"],
  );

  result().table.getRowModel().rows[0]!.toggleSelected(false);
  await waitFor(() => result().table.getSelectedRowModel().rows.length === 0);

  harness.cleanup();
});

test("useResourceTable falls back to a row's index as its id when the record carries no usable id", async () => {
  const { client } = createFakeClient([{ title: "No id" } as unknown as FakeRecord]);
  const harness = setupHarness(client);
  const result = mountTable(harness);

  await waitFor(() => result().isLoading.value === false);

  assert.equal(result().table.getRowModel().rows[0]?.id, "0");

  harness.cleanup();
});

test("useResourceTable surfaces loading/fetching/error state from the underlying query", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);
  const release = block("list");
  const result = mountTable(harness);

  assert.equal(result().isLoading.value, true);
  assert.equal(result().isFetching.value, true);
  assert.equal(result().error.value, null);

  release();
  await waitFor(() => result().isLoading.value === false);
  assert.equal(result().isFetching.value, false);

  harness.cleanup();
});
