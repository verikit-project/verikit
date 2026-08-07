import assert from "node:assert/strict";
import test from "node:test";
import { boolean, defineResource, from, text } from "@verikit/core";
import { sql } from "drizzle-orm";
import { int as mysqlInt, mysqlTable } from "drizzle-orm/mysql-core";
import { sqliteTable, text as sqliteText } from "drizzle-orm/sqlite-core";
import {
  createDrizzleAdapter,
  type AnyDrizzleDatabase,
} from "../src/create-drizzle-adapter.js";
import { searchCondition } from "../src/columns.js";
import {
  createCounterResource,
  createLegacyPostResource,
  createPostResource,
  createTestDb,
  legacyPosts,
  posts,
} from "./fixtures.js";

test("create/find/update/delete round-trip through the real table", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  const created = await adapter.create({ title: "Hello", body: "World" });
  assert.equal(created.title, "Hello");
  assert.equal(typeof created.id, "string");

  const found = await adapter.find(created.id);
  assert.deepEqual(found, created);

  const updated = await adapter.update(created.id, { title: "Updated" });
  assert.equal(updated.title, "Updated");
  assert.equal(updated.body, "World");

  await adapter.delete(created.id);
  assert.equal(await adapter.find(created.id), undefined);
});

test("find returns undefined for an unknown id", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  assert.equal(await adapter.find("missing"), undefined);
});

test("update with an empty payload returns the record unchanged instead of throwing", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  const created = await adapter.create({ title: "Hello", body: "World" });

  const updated = await adapter.update(created.id, {});
  assert.deepEqual(updated, created);
});

test("update with only unmapped fields returns the record unchanged instead of throwing", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  const created = await adapter.create({ title: "Hello", body: "World" });

  const updated = await adapter.update(created.id, { notAField: "x" });
  assert.deepEqual(updated, created);
});

test("create throws when a value is submitted for a declared field with no matching column", async () => {
  const db = createTestDb();
  const resource = defineResource("post", {
    table: posts,
    fields: {
      title: text().required(),
      // "nickname" is a declared resource field but `posts` has no such column
      // and there's no from(column).as(...) mapping for it either.
      nickname: text(),
    },
  });
  const adapter = createDrizzleAdapter(db, resource);

  await assert.rejects(
    () => adapter.create({ title: "Hello", nickname: "Nick" }),
    /field "nickname" has no matching column/,
  );
});

test("update throws when a value is submitted for a declared field with no matching column", async () => {
  const db = createTestDb();
  const resource = defineResource("post", {
    table: posts,
    fields: {
      title: text().required(),
      nickname: text(),
    },
  });
  const adapter = createDrizzleAdapter(db, resource);
  const created = await adapter.create({ title: "Hello" });

  await assert.rejects(
    () => adapter.update(created.id, { nickname: "Nick" }),
    /field "nickname" has no matching column/,
  );
});

test("update throws for an unknown id", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await assert.rejects(() => adapter.update("missing", { title: "x" }));
});

test("update with an empty payload throws for an unknown id", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await assert.rejects(() => adapter.update("missing", {}));
});

test("delete is a no-op for an unknown id", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await adapter.delete("missing");
});

test("find/update/delete treat a non-numeric id against a numeric id column as missing", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createCounterResource());

  const created = await adapter.create({ label: "A" });
  assert.equal((await adapter.find(String(created.id)))?.label, "A");

  assert.equal(await adapter.find("not-a-number"), undefined);
  await assert.rejects(() => adapter.update("not-a-number", { label: "B" }));
  await adapter.delete("not-a-number");
});

test("throws when a field's from(column) isn't a column of its resource's table", () => {
  const db = createTestDb();
  const resource = defineResource("post", {
    table: posts,
    fields: {
      title: from(legacyPosts.headline).as(text().required()),
    },
  });

  assert.throws(
    () => createDrizzleAdapter(db, resource),
    /isn't a column of its resource's table/,
  );
});

test("list paginates and reports the total across all pages", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  for (let i = 0; i < 5; i++) {
    await adapter.create({ title: `Post ${i}`, body: "" });
  }

  const page1 = await adapter.list({ page: 1, pageSize: 2 });
  assert.equal(page1.records.length, 2);
  assert.equal(page1.total, 5);

  const page3 = await adapter.list({ page: 3, pageSize: 2 });
  assert.equal(page3.records.length, 1);
});

test("list runs its row and count queries inside a single transaction", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await adapter.create({ title: "A", body: "" });
  await adapter.create({ title: "B", body: "" });

  let transactionCalls = 0;
  const originalTransaction = db.transaction.bind(db);
  db.transaction = ((fn: Parameters<typeof originalTransaction>[0]) => {
    transactionCalls++;
    return originalTransaction(fn);
  }) as typeof db.transaction;

  const result = await adapter.list({ page: 1, pageSize: 10 });

  assert.equal(
    transactionCalls,
    1,
    "list() should wrap its row and count queries in one transaction, not run them as two independent reads",
  );
  assert.equal(result.total, 2);
  assert.equal(result.records.length, 2);
});

test("list searches across every searchable field, case-insensitively", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await adapter.create({ title: "Hello world", body: "" });
  await adapter.create({ title: "Nothing", body: "contains WORLD here" });
  await adapter.create({ title: "Unrelated", body: "" });

  const result = await adapter.list({ page: 1, pageSize: 10, search: "world" });
  assert.equal(result.total, 2);
});

test("list escapes LIKE wildcards in the search term", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await adapter.create({ title: "50% off", body: "" });
  await adapter.create({ title: "50000 off", body: "" });

  const result = await adapter.list({ page: 1, pageSize: 10, search: "50%" });
  assert.equal(result.total, 1);
});

test("list with a search term returns zero results for a resource with no searchable fields", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createLegacyPostResource());

  await adapter.create({ title: "Hello" });

  const result = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "hello",
  });
  assert.deepEqual(result, { records: [], total: 0 });
});

test("list sorts by the requested field and direction", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await adapter.create({ title: "B", body: "" });
  await adapter.create({ title: "A", body: "" });
  await adapter.create({ title: "C", body: "" });

  const ascending = await adapter.list({
    page: 1,
    pageSize: 10,
    sort: { field: "title", direction: "asc" },
  });
  assert.deepEqual(
    ascending.records.map((r) => r.title),
    ["A", "B", "C"],
  );

  const descending = await adapter.list({
    page: 1,
    pageSize: 10,
    sort: { field: "title", direction: "desc" },
  });
  assert.deepEqual(
    descending.records.map((r) => r.title),
    ["C", "B", "A"],
  );
});

test("list ignores a sort field with no matching column instead of throwing", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  await adapter.create({ title: "Only", body: "" });

  const result = await adapter.list({
    page: 1,
    pageSize: 10,
    sort: { field: "published", direction: "asc" },
  });
  assert.equal(result.records.length, 1);
});

test("from(column).as(...) maps a field to a differently-named column", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createLegacyPostResource());

  const created = await adapter.create({ title: "Legacy" });
  assert.equal(created.headline, "Legacy");

  const found = await adapter.find(created.postId);
  assert.equal(found?.headline, "Legacy");
});

test("throws when the resource has no table", () => {
  const db = createTestDb();
  const resource = defineResource("untabled", {
    fields: { title: text() },
  });

  // Bypasses the compile-time guard (a resource with no `table` fails
  // `TTable extends Table` at the call site) to exercise the runtime one.
  assert.throws(
    () => createDrizzleAdapter(db, resource as never),
    /has no table/,
  );
});

test("throws when the table has no single primary key column", () => {
  const db = createTestDb();
  const noPk = sqliteTable("no_pk", { title: sqliteText("title") });
  db.run(sql`create table no_pk (title text)`);
  const resource = defineResource("noPk", {
    table: noPk,
    fields: { title: text() },
  });

  assert.throws(
    () => createDrizzleAdapter(db, resource),
    /exactly one primary key/,
  );
});

test("throws when a searchable field has no matching column", () => {
  const db = createTestDb();
  const resource = defineResource("mismatched", {
    table: posts,
    fields: { headline: text().searchable() },
  });

  assert.throws(
    () => createDrizzleAdapter(db, resource),
    /has no matching column/,
  );
});

test("throws when a searchable field maps to a non-text column", () => {
  const db = createTestDb();
  const resource = defineResource("post", {
    table: posts,
    fields: {
      title: text().required(),
      published: boolean().searchable(),
    },
  });

  assert.throws(() => createDrizzleAdapter(db, resource), /non-text column/);
});

test("throws for a MySQL table (no RETURNING support)", () => {
  const db = createTestDb();
  const mysqlPosts = mysqlTable("posts", { id: mysqlInt("id").primaryKey() });
  const resource = defineResource("mysqlPost", {
    table: mysqlPosts,
    fields: {},
  });

  assert.throws(
    () => createDrizzleAdapter(db as never, resource),
    /isn't supported yet/,
  );
});

test("boolean columns round-trip as real booleans, not 0/1", async () => {
  const db = createTestDb();
  const adapter = createDrizzleAdapter(db, createPostResource());

  const created = await adapter.create({
    title: "Flagged",
    body: "",
    published: true,
  });
  assert.equal(created.published, true);
});

test("searchCondition returns undefined for no columns", () => {
  assert.equal(searchCondition([], "hello"), undefined);
});

test("list uses an async transaction on a non-sync drizzle client", async () => {
  const rows = [{ id: "1", title: "Hello" }];
  const totalRows = [{ value: 1 }];

  function makeQuery(result: unknown[]) {
    const query = {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: () => query,
      offset: () => query,
      then: (resolve: (value: unknown[]) => void) => resolve(result),
    };
    return query;
  }

  let transactionCalled = false;
  const fakeDb = {
    // Marks this client as one of Postgres/MySQL's genuinely async
    // dialects, unlike better-sqlite3's synchronous "sync" resultKind.
    resultKind: "async",
    select: (fields?: unknown) => makeQuery(fields ? totalRows : rows),
    transaction: async (fn: (tx: unknown) => unknown) => {
      transactionCalled = true;
      return fn(fakeDb);
    },
  };

  const adapter = createDrizzleAdapter(
    fakeDb as unknown as AnyDrizzleDatabase,
    createPostResource(),
  );
  const result = await adapter.list({ page: 1, pageSize: 10 });

  assert.equal(transactionCalled, true);
  assert.deepEqual(result, { records: rows, total: 1 });
});
