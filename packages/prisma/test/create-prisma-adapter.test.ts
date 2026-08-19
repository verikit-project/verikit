import assert from "node:assert/strict";
import test from "node:test";
import { boolean, defineResource, text } from "@verikit/core";
import { UniqueConstraintError } from "@verikit/server";
import {
  createPrismaAdapter,
  type PrismaModelDelegate,
} from "../src/create-prisma-adapter.js";
import {
  isUniqueConstraintError,
  mapFilterToPrisma,
  uniqueConstraintFields,
} from "../src/mapping.js";
import {
  createCounterAdapter,
  createLegacyPostAdapter,
  createPostAdapter,
  createPostResource,
  createTagAdapter,
  createTestDb,
} from "./fixtures.js";

test("mapFilterToPrisma translates each ResourceFilter key to Prisma's own filter shape", () => {
  assert.deepEqual(mapFilterToPrisma({ eq: "x" }), { equals: "x" });
  assert.deepEqual(mapFilterToPrisma({ eq: null }), { equals: null });
  assert.deepEqual(mapFilterToPrisma({ gte: 1 }), { gte: 1 });
  assert.deepEqual(mapFilterToPrisma({ gt: 1 }), { gt: 1 });
  assert.deepEqual(mapFilterToPrisma({ lte: 1 }), { lte: 1 });
  assert.deepEqual(mapFilterToPrisma({ lt: 1 }), { lt: 1 });
  assert.deepEqual(mapFilterToPrisma({}), {});
});

test("isUniqueConstraintError is true only for a P2002-coded error", () => {
  assert.equal(
    isUniqueConstraintError(Object.assign(new Error(), { code: "P2002" })),
    true,
  );
  assert.equal(
    isUniqueConstraintError(Object.assign(new Error(), { code: "P2025" })),
    false,
  );
  assert.equal(isUniqueConstraintError(new Error("plain")), false);
  assert.equal(isUniqueConstraintError(null), false);
  assert.equal(isUniqueConstraintError("P2002"), false);
});

test("uniqueConstraintFields prefers Prisma 7's driver-adapter constraint.fields over meta.target", () => {
  const error = {
    meta: {
      target: ["title"],
      driverAdapterError: { cause: { constraint: { fields: ["title"] } } },
    },
  };
  assert.deepEqual(
    uniqueConstraintFields(error, { title: "title", body: "body" }),
    ["title"],
  );
});

test("uniqueConstraintFields reads Prisma 6's array-valued meta.target", () => {
  const error = { meta: { target: ["title"] } };
  assert.deepEqual(
    uniqueConstraintFields(error, { title: "title", body: "body" }),
    ["title"],
  );
});

test("uniqueConstraintFields reads MySQL's single-string meta.target, unresolved if it names no known scalar", () => {
  const error = { meta: { target: "posts_title_key" } };
  assert.deepEqual(
    uniqueConstraintFields(error, { title: "title", body: "body" }),
    ["posts_title_key"],
  );
});

test("uniqueConstraintFields returns an empty array when the error has no meta at all", () => {
  assert.deepEqual(
    uniqueConstraintFields(new Error("no meta"), { title: "title" }),
    [],
  );
});

test("uniqueConstraintFields falls back to the raw scalar name when it matches no declared field", () => {
  const error = { meta: { target: ["secret"] } };
  assert.deepEqual(
    uniqueConstraintFields(error, { title: "title", body: "body" }),
    ["secret"],
  );
});

test("create/find/update/delete round-trip through a real Prisma client", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  const created = await adapter.create({ title: "Hello", body: "World" });
  assert.equal(created.title, "Hello");
  assert.equal(typeof created.id, "string");

  const found = await adapter.find(created.id);
  assert.deepEqual(found, created);

  const updated = await adapter.update(created.id, { title: "Updated" });
  assert.ok(updated);
  assert.equal(updated.title, "Updated");
  assert.equal(updated.body, "World");

  await adapter.delete(created.id);
  assert.equal(await adapter.find(created.id), undefined);
});

test("find returns undefined for an unknown id", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  assert.equal(await adapter.find("missing"), undefined);
});

test("update with an empty payload succeeds and returns the record unchanged", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  const created = await adapter.create({ title: "Hello", body: "World" });
  const updated = await adapter.update(created.id, {});
  assert.deepEqual(updated, created);
});

test("update with only unmapped fields returns the record unchanged", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  const created = await adapter.create({ title: "Hello", body: "World" });
  const updated = await adapter.update(created.id, { notAField: "x" });
  assert.deepEqual(updated, created);
});

test("update returns undefined for an unknown id, instead of throwing", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  assert.equal(await adapter.update("missing", { title: "x" }), undefined);
});

test("update returns undefined (P2025) for a valid id whose record was deleted first, matching find's existence-check-isn't-atomic case", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);
  const created = await adapter.create({ title: "Hello" });

  await adapter.delete(created.id);

  assert.equal(
    await adapter.update(created.id, { title: "Too late" }),
    undefined,
  );
});

test("delete is idempotent (P2025) for an unknown id", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  await adapter.delete("missing");
});

test("delete is idempotent for a record already deleted by a concurrent caller", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);
  const created = await adapter.create({ title: "Hello" });

  await db.post.delete({ where: { id: created.id } });

  await adapter.delete(created.id);
});

test("create rethrows a non-P2002 error instead of swallowing it", async () => {
  const timeout = Object.assign(new Error("Query timed out"), {
    code: "P2024",
  });
  const model: PrismaModelDelegate = {
    findMany: async () => [],
    count: async () => 0,
    findUnique: async () => null,
    create: async () => {
      throw timeout;
    },
    update: async () => ({}),
    delete: async () => ({}),
  };

  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  await assert.rejects(
    () => adapter.create({ title: "x" }),
    (error) => error === timeout,
  );
});

test("update rethrows a non-P2025, non-P2002 error instead of swallowing it", async () => {
  const timeout = Object.assign(new Error("Query timed out"), {
    code: "P2024",
  });
  const model: PrismaModelDelegate = {
    findMany: async () => [],
    count: async () => 0,
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => {
      throw timeout;
    },
    delete: async () => ({}),
  };

  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  await assert.rejects(
    () => adapter.update("1", { title: "x" }),
    (error) => error === timeout,
  );
});

test("create translates a P2002 unique-constraint violation into a UniqueConstraintError naming the field", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createTagAdapter(db);

  await adapter.create({ name: "release" });

  await assert.rejects(
    () => adapter.create({ name: "release" }),
    (error: unknown) =>
      error instanceof UniqueConstraintError &&
      error.fields.length === 1 &&
      error.fields[0] === "name",
  );
});

test("update translates a P2002 unique-constraint violation into a UniqueConstraintError naming the field", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createTagAdapter(db);

  await adapter.create({ name: "release" });
  const other = await adapter.create({ name: "draft" });

  await assert.rejects(
    () => adapter.update(other.id, { name: "release" }),
    (error: unknown) =>
      error instanceof UniqueConstraintError &&
      error.fields.length === 1 &&
      error.fields[0] === "name",
  );
});

test("delete rethrows a non-P2025 error instead of swallowing it", async () => {
  const dbLocked = Object.assign(new Error("Database is locked"), {
    code: "P2034",
  });
  const model: PrismaModelDelegate = {
    findMany: async () => [],
    count: async () => 0,
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => {
      throw dbLocked;
    },
  };

  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  await assert.rejects(
    () => adapter.delete("1"),
    (error) => error === dbLocked,
  );
});

test("find/update/delete treat a non-numeric id against a numeric id field as missing, without querying", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createCounterAdapter(db);

  const created = await adapter.create({ label: "A" });
  assert.equal((await adapter.find(created.id))?.label, "A");

  assert.equal(await adapter.find("not-a-number"), undefined);
  assert.equal(await adapter.update("not-a-number", { label: "B" }), undefined);
  await adapter.delete("not-a-number");
});

test("list paginates and reports the total across all pages", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  for (let i = 0; i < 5; i++) {
    await adapter.create({ title: `Post ${i}`, body: "" });
  }

  const page1 = await adapter.list({ page: 1, pageSize: 2 });
  assert.equal(page1.records.length, 2);
  assert.equal(page1.total, 5);

  const page3 = await adapter.list({ page: 3, pageSize: 2 });
  assert.equal(page3.records.length, 1);
});

test("list uses the injected transaction delegate for rows and total", async () => {
  const rootCalls: string[] = [];
  const transactionCalls: string[] = [];
  const rootModel: PrismaModelDelegate = {
    findMany: async () => {
      rootCalls.push("findMany");
      return [];
    },
    count: async () => {
      rootCalls.push("count");
      return 0;
    },
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  };
  const transactionModel: PrismaModelDelegate = {
    ...rootModel,
    findMany: async () => {
      transactionCalls.push("findMany");
      return [{ id: "1", title: "In transaction", body: "", published: false }];
    },
    count: async () => {
      transactionCalls.push("count");
      return 1;
    },
  };
  let transactions = 0;
  const adapter = createPrismaAdapter(createPostResource(), {
    model: rootModel,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: async (operation) => {
      transactions += 1;
      return operation(transactionModel);
    },
  });

  const page = await adapter.list({ page: 1, pageSize: 10 });
  assert.equal(transactions, 1);
  assert.deepEqual(rootCalls, []);
  assert.deepEqual(transactionCalls.sort(), ["count", "findMany"]);
  assert.equal(page.total, 1);
  assert.equal(page.records[0]?.title, "In transaction");
});

test("find/update/delete/list honor a scope, and reject an unmapped scope field", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  const mine = await adapter.create({ title: "Mine", body: "" });
  const theirs = await adapter.create({ title: "Theirs", body: "" });

  assert.deepEqual(await adapter.find(mine.id, { title: "Mine" }), mine);
  assert.equal(await adapter.find(theirs.id, { title: "Mine" }), undefined);

  const updated = await adapter.update(
    mine.id,
    { body: "updated" },
    { title: "Mine" },
  );
  assert.equal(updated?.body, "updated");
  assert.equal(
    await adapter.update(theirs.id, { body: "nope" }, { title: "Mine" }),
    undefined,
  );

  const scopedList = await adapter.list({
    page: 1,
    pageSize: 10,
    scope: { title: "Mine" },
  });
  assert.equal(scopedList.total, 1);

  await adapter.delete(theirs.id, { title: "Mine" });
  assert.notEqual(await adapter.find(theirs.id), undefined);

  await adapter.delete(theirs.id, { title: "Theirs" });
  assert.equal(await adapter.find(theirs.id), undefined);

  await assert.rejects(
    () => adapter.find(mine.id, { notAField: "x" }),
    /has no Prisma mapping/,
  );

  assert.deepEqual(await adapter.find(mine.id, {}), updated);
});

function matchesPrismaWhere(
  row: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  if ("AND" in where) {
    return (where.AND as Record<string, unknown>[]).every((clause) =>
      matchesPrismaWhere(row, clause),
    );
  }
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

test("scoped update falls back to updateMany + a follow-up find when the delegate lacks updateManyAndReturn", async () => {
  const rows: Record<string, unknown>[] = [
    { id: "1", title: "Mine", body: "", published: false },
    { id: "2", title: "Theirs", body: "", published: false },
  ];
  // Deliberately omits `updateManyAndReturn` to exercise createPrismaAdapter's updateMany-then-find fallback path.
  const model: PrismaModelDelegate = {
    findMany: async () => rows,
    count: async () => rows.length,
    findUnique: async ({ where }) =>
      rows.find((row) => row.id === where.id) ?? null,
    findFirst: async ({ where }) =>
      rows.find((row) => matchesPrismaWhere(row, where)) ?? null,
    create: async () => ({}),
    update: async () => ({}),
    updateMany: async ({ where, data }) => {
      const matches = rows.filter((row) => matchesPrismaWhere(row, where));
      for (const row of matches) Object.assign(row, data);
      return { count: matches.length };
    },
    delete: async () => ({}),
  };
  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  // Calling the method without an adapter-object receiver must not break the
  // updateMany-then-find fallback.
  const { update } = adapter;
  const updated = await update("1", { body: "updated" }, { title: "Mine" });
  assert.equal(updated?.body, "updated");

  const missed = await update("2", { body: "nope" }, { title: "Mine" });
  assert.equal(missed, undefined);
});

test("scoped update translates a P2002 unique-constraint violation into a UniqueConstraintError naming the field", async () => {
  const conflict = Object.assign(new Error("Unique constraint failed"), {
    code: "P2002",
    meta: { target: ["title"] },
  });
  const model: PrismaModelDelegate = {
    findMany: async () => [],
    count: async () => 0,
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    updateManyAndReturn: async () => {
      throw conflict;
    },
    delete: async () => ({}),
  };
  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  await assert.rejects(
    () => adapter.update("1", { title: "Taken" }, { title: "Mine" }),
    (error: unknown) =>
      error instanceof UniqueConstraintError &&
      error.fields.length === 1 &&
      error.fields[0] === "title",
  );
});

test("list applies exact and range filters, and rejects an unmapped filter field", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  await adapter.create({ title: "Alpha", body: "", published: true });
  await adapter.create({ title: "Beta", body: "", published: false });
  await adapter.create({ title: "Gamma", body: "", published: false });

  const exact = await adapter.list({
    page: 1,
    pageSize: 10,
    filters: { published: { eq: true } },
  });
  assert.equal(exact.total, 1);
  assert.equal(exact.records[0]?.title, "Alpha");

  const ranged = await adapter.list({
    page: 1,
    pageSize: 10,
    filters: { title: { gte: "Beta", lt: "Gamma" } },
  });
  assert.equal(ranged.total, 1);
  assert.equal(ranged.records[0]?.title, "Beta");

  await assert.rejects(
    () =>
      adapter.list({
        page: 1,
        pageSize: 10,
        filters: { notAField: { eq: "x" } },
      }),
    /has no Prisma mapping/,
  );
});

test("scoped find/update/delete reject a model delegate missing findFirst/updateMany/deleteMany", async () => {
  const model: PrismaModelDelegate = {
    findMany: async () => [],
    count: async () => 0,
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  };
  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  await assert.rejects(
    () => adapter.find("1", { title: "x" }),
    /scoped reads require a Prisma delegate with findFirst/,
  );
  await assert.rejects(
    () => adapter.update("1", { title: "y" }, { title: "x" }),
    /scoped updates require a Prisma delegate with updateMany/,
  );
  await assert.rejects(
    () => adapter.delete("1", { title: "x" }),
    /scoped deletes require a Prisma delegate with deleteMany/,
  );
});

test("list searches across every searchable field, case-insensitively on SQLite", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  await adapter.create({ title: "Hello world", body: "" });
  await adapter.create({ title: "Nothing", body: "contains WORLD here" });
  await adapter.create({ title: "Unrelated", body: "" });

  const result = await adapter.list({ page: 1, pageSize: 10, search: "world" });
  assert.equal(result.total, 2);
});

test("list restricts free-text search to server-authorized searchable fields", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  await adapter.create({ title: "Visible match", body: "" });
  await adapter.create({ title: "Unrelated", body: "hidden match" });

  const result = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "match",
    searchFields: ["title"],
  });

  assert.equal(result.total, 1);
  assert.equal(result.records[0]?.title, "Visible match");
});

test("list searches a literal percent sign", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  await adapter.create({ title: "50% off", body: "" });
  await adapter.create({ title: "50000 off", body: "" });

  // `%` is matched literally, not as a SQL LIKE wildcard.
  const result = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "50%",
    sort: { field: "title", direction: "asc" },
  });
  assert.equal(result.total, 1);
  assert.equal(result.records[0]?.title, "50% off");
});

test("list searches literal underscores and backslashes", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  await adapter.create({ title: "item_1", body: "" });
  await adapter.create({ title: "itemX1", body: "" });
  await adapter.create({ title: "C:\\uploads", body: "" });
  await adapter.create({ title: "C:/uploads", body: "" });

  const underscore = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "item_1",
  });
  assert.equal(underscore.total, 1);
  assert.equal(underscore.records[0]?.title, "item_1");

  const backslash = await adapter.list({
    page: 1,
    pageSize: 10,
    search: "C:\\uploads",
  });
  assert.equal(backslash.total, 1);
  assert.equal(backslash.records[0]?.title, "C:\\uploads");
});

test("literal search caps candidate reads instead of loading the whole scoped table", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  let countCalls = 0;
  const model: PrismaModelDelegate = {
    findMany: async (args) => {
      findManyArgs = args as Record<string, unknown>;
      return [
        { id: "1", title: "one", body: "", published: false },
        { id: "2", title: "two", body: "", published: false },
        { id: "3", title: "three", body: "", published: false },
      ];
    },
    count: async () => {
      countCalls += 1;
      return 3;
    },
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  };
  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    literalSearchCandidateLimit: 2,
    listTransaction: (operation) => operation(model),
  });

  await assert.rejects(
    () => adapter.list({ page: 1, pageSize: 10, search: "%" }),
    /exceeds the 2-row candidate limit/,
  );
  assert.equal(findManyArgs?.take, 3);
  assert.equal("skip" in (findManyArgs ?? {}), false);
  assert.equal(countCalls, 0);
});

test("literal search candidate limit must be a positive integer", () => {
  const model: PrismaModelDelegate = {
    findMany: async () => [],
    count: async () => 0,
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  };

  for (const literalSearchCandidateLimit of [0, 1.5]) {
    assert.throws(
      () =>
        createPrismaAdapter(createPostResource(), {
          model,
          fields: { title: "title", body: "body", published: "published" },
          id: { field: "id" },
          literalSearchCandidateLimit,
          listTransaction: (operation) => operation(model),
        }),
      /literalSearchCandidateLimit must be a positive integer/,
    );
  }
});

test("list with a search term returns zero results for a resource with no searchable fields, without querying", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createLegacyPostAdapter(db);

  await adapter.create({ title: "Hello" });

  const result = await adapter.list({ page: 1, pageSize: 10, search: "hello" });
  assert.deepEqual(result, { records: [], total: 0 });
});

test("list sorts by the requested field and direction", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

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

test("list ignores a sort field with no matching Prisma mapping instead of throwing", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  await adapter.create({ title: "Only", body: "" });

  const result = await adapter.list({
    page: 1,
    pageSize: 10,
    sort: { field: "nonexistent", direction: "asc" },
  });
  assert.equal(result.records.length, 1);
});

test("fields maps a resource field to a differently-named Prisma scalar", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createLegacyPostAdapter(db);

  const created = await adapter.create({ title: "Legacy" });
  assert.deepEqual(created, { id: created.id, title: "Legacy" });

  const found = await adapter.find(created.id);
  assert.deepEqual(found, { id: created.id, title: "Legacy" });
});

test("adapter results expose only resource fields and canonical id, never an undeclared column", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);
  const created = await adapter.create({ title: "Hello", body: "World" });

  await db.post.update({
    where: { id: created.id },
    data: { secret: "do not expose" },
  });

  assert.deepEqual(await adapter.find(created.id), {
    id: created.id,
    title: "Hello",
    body: "World",
    published: false,
  });
  assert.deepEqual(await adapter.list({ page: 1, pageSize: 10 }), {
    records: [
      { id: created.id, title: "Hello", body: "World", published: false },
    ],
    total: 1,
  });
});

test("boolean fields round-trip as real booleans, not 0/1", async (t) => {
  const db = await createTestDb();
  t.after(() => db.$disconnect());
  const adapter = createPostAdapter(db);

  const created = await adapter.create({
    title: "Flagged",
    body: "",
    published: true,
  });
  assert.equal(created.published, true);
});

test("throws at construction when fields is missing a mapping for a declared resource field", () => {
  const resource = defineResource("post", {
    fields: {
      title: text().required(),
      nickname: text(),
    },
  });

  assert.throws(
    () =>
      createPrismaAdapter(resource, {
        model: {} as PrismaModelDelegate,
        fields: { title: "title" } as never,
        id: { field: "id" },
        listTransaction: (operation) => operation({} as PrismaModelDelegate),
      }),
    /has no Prisma field mapping for: nickname/,
  );
});

test("throws at construction when a searchable field's fieldType isn't text-like", () => {
  const resource = defineResource("post", {
    fields: {
      title: text().required(),
      published: boolean().searchable(),
    },
  });

  assert.throws(
    () =>
      createPrismaAdapter(resource, {
        model: {} as PrismaModelDelegate,
        fields: { title: "title", published: "published" },
        id: { field: "id" },
        listTransaction: (operation) => operation({} as PrismaModelDelegate),
      }),
    /Search only supports text fields/,
  );
});

test("list runs findMany and count exactly once each per call, with the same where filter", async () => {
  const calls: { method: string; args: unknown }[] = [];
  const model: PrismaModelDelegate = {
    findMany: async (args) => {
      calls.push({ method: "findMany", args });
      return [{ id: "1", title: "Hello" }];
    },
    count: async (args) => {
      calls.push({ method: "count", args });
      return 1;
    },
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  };

  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  await adapter.list({ page: 1, pageSize: 10, search: "hello" });

  const findManyCalls = calls.filter((c) => c.method === "findMany");
  const countCalls = calls.filter((c) => c.method === "count");
  assert.equal(findManyCalls.length, 1);
  assert.equal(countCalls.length, 1);
  assert.deepEqual(
    (findManyCalls[0]!.args as { where: unknown }).where,
    (countCalls[0]!.args as { where: unknown }).where,
  );
});

test("never sends an `include`, only a `select` scoped to the configured fields and id", async () => {
  let selectSeen: unknown;
  let includeSeen = false;
  const model: PrismaModelDelegate = {
    findMany: async () => [],
    count: async () => 0,
    findUnique: async (args) => {
      selectSeen = args.select;
      includeSeen = "include" in args;
      return { id: "1", title: "Hi", body: null, published: false };
    },
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  };

  const adapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });

  await adapter.find("1");

  assert.equal(includeSeen, false);
  assert.deepEqual(selectSeen, {
    id: true,
    title: true,
    body: true,
    published: true,
  });
});

test('provider: "postgresql" adds mode: "insensitive" to the search filter; the default omits it', async () => {
  let lastWhere: unknown;
  const model: PrismaModelDelegate = {
    findMany: async (args) => {
      lastWhere = args.where;
      return [];
    },
    count: async () => 0,
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  };

  const sqliteAdapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    listTransaction: (operation) => operation(model),
  });
  await sqliteAdapter.list({ page: 1, pageSize: 10, search: "hi" });
  assert.deepEqual(lastWhere, {
    OR: [{ title: { contains: "hi" } }, { body: { contains: "hi" } }],
  });

  const postgresAdapter = createPrismaAdapter(createPostResource(), {
    model,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
    provider: "postgresql",
    listTransaction: (operation) => operation(model),
  });
  await postgresAdapter.list({ page: 1, pageSize: 10, search: "hi" });
  assert.deepEqual(lastWhere, {
    OR: [
      { title: { contains: "hi", mode: "insensitive" } },
      { body: { contains: "hi", mode: "insensitive" } },
    ],
  });
});
