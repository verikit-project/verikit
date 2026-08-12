import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryAdapter } from "../../src/testing/in-memory-adapter.js";

interface Widget extends Record<string, unknown> {
  id: string;
  name: string;
  tag?: string;
  views?: number;
}

test("createInMemoryAdapter defaults to no seed records and no options", async () => {
  const adapter = createInMemoryAdapter<Widget & { id: string }>();

  assert.deepEqual(adapter.records, []);
  assert.deepEqual(await adapter.list({ page: 1, pageSize: 10 }), {
    records: [],
    total: 0,
  });
});

test("createInMemoryAdapter without createDefaults builds a record from just the submitted values", async () => {
  const adapter = createInMemoryAdapter<Widget>();

  const created = await adapter.create({ name: "Ada" });
  assert.equal(created.name, "Ada");
  assert.equal(typeof created.id, "string");
});

test("createInMemoryAdapter's create() applies createDefaults before the submitted values", async () => {
  const adapter = createInMemoryAdapter<Widget>([], {
    createDefaults: () => ({ name: "untitled", tag: "draft" }),
  });

  const created = await adapter.create({ name: "Widget" });
  assert.equal(created.name, "Widget");
  assert.equal(created.tag, "draft");
});

test("createInMemoryAdapter's list() applies scope", async () => {
  const adapter = createInMemoryAdapter<Widget>([
    { id: "1", name: "Alpha", tag: "mine" },
    { id: "2", name: "Beta", tag: "mine" },
    { id: "3", name: "Gamma", tag: "theirs" },
  ]);

  const scoped = await adapter.list({
    page: 1,
    pageSize: 10,
    scope: { tag: "mine" },
  });
  assert.equal(scoped.total, 2);

  const unscoped = await adapter.list({ page: 1, pageSize: 10 });
  assert.equal(unscoped.total, 3);
});

test("createInMemoryAdapter's list() applies every exact and range filter operator", async () => {
  const adapter = createInMemoryAdapter<Widget>([
    { id: "1", name: "Alpha", views: 5 },
    { id: "2", name: "Beta", views: 10 },
    { id: "3", name: "Gamma", views: 15 },
  ]);

  const exact = await adapter.list({
    page: 1,
    pageSize: 10,
    filters: { views: { eq: 10 } },
  });
  assert.equal(exact.total, 1);
  assert.equal(exact.records[0]?.id, "2");

  const gte = await adapter.list({
    page: 1,
    pageSize: 10,
    filters: { views: { gte: 10 } },
  });
  assert.equal(gte.total, 2);

  const gt = await adapter.list({
    page: 1,
    pageSize: 10,
    filters: { views: { gt: 10 } },
  });
  assert.equal(gt.total, 1);
  assert.equal(gt.records[0]?.id, "3");

  const lte = await adapter.list({
    page: 1,
    pageSize: 10,
    filters: { views: { lte: 10 } },
  });
  assert.equal(lte.total, 2);

  const lt = await adapter.list({
    page: 1,
    pageSize: 10,
    filters: { views: { lt: 10 } },
  });
  assert.equal(lt.total, 1);
  assert.equal(lt.records[0]?.id, "1");

  const noFilters = await adapter.list({ page: 1, pageSize: 10 });
  assert.equal(noFilters.total, 3);
});

test("createInMemoryAdapter's list() restricts free-text search to searchableFields, and to a narrower per-request searchFields", async () => {
  const adapter = createInMemoryAdapter<Widget>(
    [
      { id: "1", name: "Alpha widget", tag: "special" },
      { id: "2", name: "Beta widget", tag: "plain" },
      { id: "3", name: "Gamma widget" },
    ],
    { searchableFields: ["name", "tag"] },
  );

  // Matches via "tag", which is configured as searchable and not restricted.
  const byTag = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "special",
  });
  assert.equal(byTag.total, 1);
  assert.equal(byTag.records[0]?.id, "1");

  // A per-request searchFields explicitly including "name" still matches on it.
  const byNameAllowed = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "beta",
    searchFields: ["name"],
  });
  assert.equal(byNameAllowed.total, 1);

  // A per-request searchFields that excludes "tag" hides matches that would
  // otherwise come from it.
  const tagExcluded = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "special",
    searchFields: ["name"],
  });
  assert.equal(tagExcluded.total, 0);

  // A record missing the searched field entirely (undefined, not just empty)
  // is treated as not matching rather than throwing.
  const missingField = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "plain",
  });
  assert.equal(missingField.total, 1);
  assert.equal(missingField.records[0]?.id, "2");

  const noSearch = await adapter.list({ page: 1, pageSize: 10 });
  assert.equal(noSearch.total, 3);
});

test("createInMemoryAdapter's list() sorts ascending and descending, including ties, and paginates", async () => {
  const adapter = createInMemoryAdapter<Widget>([
    { id: "1", name: "Alpha", views: 10 },
    { id: "2", name: "Beta", views: 5 },
    { id: "3", name: "Gamma", views: 10 },
  ]);

  const ascending = await adapter.list({
    page: 1,
    pageSize: 10,
    sort: { field: "views", direction: "asc" },
  });
  assert.deepEqual(
    ascending.records.map((r) => r.id),
    ["2", "1", "3"],
  );

  const descending = await adapter.list({
    page: 1,
    pageSize: 10,
    sort: { field: "views", direction: "desc" },
  });
  assert.deepEqual(
    descending.records.map((r) => r.id),
    ["1", "3", "2"],
  );

  const page2 = await adapter.list({ page: 2, pageSize: 2 });
  assert.equal(page2.records.length, 1);
  assert.equal(page2.total, 3);
});

test("createInMemoryAdapter's find/update/delete honor scope and report a mismatch as not found", async () => {
  const adapter = createInMemoryAdapter<Widget>([
    { id: "1", name: "Alpha", tag: "mine" },
  ]);

  assert.equal(await adapter.find("missing"), undefined);
  assert.equal(await adapter.find("1", { tag: "theirs" }), undefined);
  assert.deepEqual(await adapter.find("1", { tag: "mine" }), {
    id: "1",
    name: "Alpha",
    tag: "mine",
  });
  assert.deepEqual(await adapter.find("1"), {
    id: "1",
    name: "Alpha",
    tag: "mine",
  });

  assert.equal(await adapter.update("missing", { name: "x" }), undefined);
  assert.equal(
    await adapter.update("1", { name: "x" }, { tag: "theirs" }),
    undefined,
  );
  const updated = await adapter.update("1", { name: "Updated" });
  assert.equal(updated?.name, "Updated");

  await adapter.delete("missing");
  assert.equal(adapter.records.length, 1);

  await adapter.delete("1", { tag: "theirs" });
  assert.equal(adapter.records.length, 1);

  await adapter.delete("1", { tag: "mine" });
  assert.equal(adapter.records.length, 0);
});
