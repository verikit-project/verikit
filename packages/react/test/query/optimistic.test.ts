import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  patchCachedListRecord,
  removeCachedListRecord,
  restoreDeletedRecord,
  restoreResourceQueries,
  snapshotResourceQueries,
} from "../../src/query/optimistic.js";
import { resourceQueryKeys } from "../../src/query/query-keys.js";

interface Row {
  id: string;
  title: string;
}

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

test("snapshotResourceQueries/restoreResourceQueries round-trip every cached query under a resource's prefix", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");

  queryClient.setQueryData(keys.list(), {
    records: [{ id: "1", title: "Hello" }],
    total: 1,
    page: 1,
    pageSize: 25,
  });
  queryClient.setQueryData(keys.find("1"), { id: "1", title: "Hello" });

  const snapshot = snapshotResourceQueries(queryClient, keys);
  assert.equal(snapshot.length, 2);

  queryClient.setQueryData(keys.find("1"), { id: "1", title: "Mutated" });
  queryClient.removeQueries({ queryKey: keys.list(), exact: true });

  restoreResourceQueries(queryClient, snapshot);

  assert.deepEqual(queryClient.getQueryData(keys.find("1")), {
    id: "1",
    title: "Hello",
  });
  assert.deepEqual(queryClient.getQueryData(keys.list()), {
    records: [{ id: "1", title: "Hello" }],
    total: 1,
    page: 1,
    pageSize: 25,
  });
});

test("restoreDeletedRecord rolls back only the failed row without resurrecting a concurrently deleted sibling", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");
  const original = {
    records: [
      { id: "1", title: "One" },
      { id: "2", title: "Two" },
    ],
    total: 2,
    page: 1,
    pageSize: 25,
  };
  queryClient.setQueryData(keys.list(), original);
  queryClient.setQueryData(keys.find("1"), original.records[0]);
  const snapshot = snapshotResourceQueries(queryClient, keys);

  // Mirror two concurrent optimistic deletes. The first one fails; the
  // second succeeds and must remain absent from the rollback result.
  removeCachedListRecord<Row>(queryClient, keys, "1");
  removeCachedListRecord<Row>(queryClient, keys, "2");
  queryClient.removeQueries({ queryKey: keys.find("1"), exact: true });

  restoreDeletedRecord<Row>(queryClient, snapshot, "1");

  assert.deepEqual(queryClient.getQueryData(keys.list()), {
    records: [{ id: "1", title: "One" }],
    total: 1,
    page: 1,
    pageSize: 25,
  });
  assert.deepEqual(queryClient.getQueryData(keys.find("1")), {
    id: "1",
    title: "One",
  });

  // Reapplying the same failed rollback is idempotent: it cannot duplicate
  // the row while a query is settling/refetching.
  restoreDeletedRecord<Row>(queryClient, snapshot, "1");
  assert.equal(
    queryClient.getQueryData<{ records: Row[] }>(keys.list())?.records.length,
    1,
  );
});

test("patchCachedListRecord patches only the matching record, leaving others untouched", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");

  queryClient.setQueryData(keys.list(), {
    records: [
      { id: "1", title: "Hello" },
      { id: "2", title: "World" },
    ],
    total: 2,
    page: 1,
    pageSize: 25,
  });

  patchCachedListRecord<Row>(queryClient, keys, "1", (record) => ({
    ...record,
    title: "Changed",
  }));

  assert.deepEqual(queryClient.getQueryData(keys.list()), {
    records: [
      { id: "1", title: "Changed" },
      { id: "2", title: "World" },
    ],
    total: 2,
    page: 1,
    pageSize: 25,
  });
});

test("patchCachedListRecord matches a numeric record id against the string mutation id (e.g. a Prisma autoincrement key)", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");

  queryClient.setQueryData(keys.list(), {
    records: [
      { id: 1, title: "Hello" },
      { id: 2, title: "World" },
    ],
    total: 2,
    page: 1,
    pageSize: 25,
  });

  patchCachedListRecord(queryClient, keys, "1", (record) => ({
    ...(record as { id: number; title: string }),
    title: "Changed",
  }));

  assert.deepEqual(queryClient.getQueryData(keys.list()), {
    records: [
      { id: 1, title: "Changed" },
      { id: 2, title: "World" },
    ],
    total: 2,
    page: 1,
    pageSize: 25,
  });
});

test("removeCachedListRecord matches a numeric record id against the string mutation id (e.g. a Prisma autoincrement key)", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");

  queryClient.setQueryData(keys.list(), {
    records: [
      { id: 1, title: "Hello" },
      { id: 2, title: "World" },
    ],
    total: 2,
    page: 1,
    pageSize: 25,
  });

  removeCachedListRecord(queryClient, keys, "1");

  assert.deepEqual(queryClient.getQueryData(keys.list()), {
    records: [{ id: 2, title: "World" }],
    total: 1,
    page: 1,
    pageSize: 25,
  });
});

test("patchCachedListRecord leaves a record with no matching/string id untouched", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");
  const withoutId = { title: "No id" } as unknown as Row;

  queryClient.setQueryData(keys.list(), {
    records: [withoutId],
    total: 1,
    page: 1,
    pageSize: 25,
  });

  patchCachedListRecord<Row>(queryClient, keys, "1", (record) => ({
    ...record,
    title: "Should not apply",
  }));

  assert.deepEqual(
    queryClient.getQueryData<{ records: Row[] }>(keys.list())?.records,
    [withoutId],
  );
});

test("patchCachedListRecord and removeCachedListRecord no-op on a matched query with no data yet", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");

  // A list query that's been started (matches the predicate) but hasn't
  // resolved yet, so its cached data is still `undefined`.
  void queryClient.prefetchQuery({
    queryKey: keys.list(),
    queryFn: () => new Promise<never>(() => {}),
  });
  assert.equal(queryClient.getQueryData(keys.list()), undefined);

  assert.doesNotThrow(() => {
    patchCachedListRecord<Row>(queryClient, keys, "1", (record) => record);
    removeCachedListRecord<Row>(queryClient, keys, "1");
  });
  assert.equal(queryClient.getQueryData(keys.list()), undefined);
});

test("removeCachedListRecord removes the matching record and decrements total", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");

  queryClient.setQueryData(keys.list(), {
    records: [
      { id: "1", title: "Hello" },
      { id: "2", title: "World" },
    ],
    total: 2,
    page: 1,
    pageSize: 25,
  });

  removeCachedListRecord<Row>(queryClient, keys, "1");

  assert.deepEqual(queryClient.getQueryData(keys.list()), {
    records: [{ id: "2", title: "World" }],
    total: 1,
    page: 1,
    pageSize: 25,
  });
});

test("removeCachedListRecord returns the same data reference when nothing matches", () => {
  const queryClient = createClient();
  const keys = resourceQueryKeys("posts");
  const data = {
    records: [{ id: "1", title: "Hello" }],
    total: 1,
    page: 1,
    pageSize: 25,
  };

  queryClient.setQueryData(keys.list(), data);
  removeCachedListRecord<Row>(queryClient, keys, "missing");

  assert.equal(queryClient.getQueryData(keys.list()), data);
});
