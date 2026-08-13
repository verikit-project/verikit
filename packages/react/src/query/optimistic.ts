import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ListResponse } from "@verikit/client";
import type { ResourceQueryKeys } from "./query-keys.js";

export type ResourceQuerySnapshot = Array<[QueryKey, unknown]>;

/**
 * Snapshots every cached query under a resource's key prefix, for rollback on error.
 */
export function snapshotResourceQueries(
  queryClient: QueryClient,
  keys: ResourceQueryKeys,
): ResourceQuerySnapshot {
  return queryClient.getQueriesData({ queryKey: keys.all });
}

/**
 * Restores a snapshot taken by `snapshotResourceQueries`, recreating any entry that was removed.
 */
export function restoreResourceQueries(
  queryClient: QueryClient,
  snapshot: ResourceQuerySnapshot,
): void {
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

// Adapters return whatever id type their storage uses (e.g. Prisma/drizzle's
// numeric autoincrement primary keys), while the mutation-side `id` this is
// matched against is always the string path segment from `ResourceAdapter`'s
// contract, so stringify a numeric id here rather than letting a numeric-id
// resource silently never match anything in cache.
export function recordId(record: unknown): string | undefined {
  const value = (record as { id?: unknown } | null)?.id;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

const isListQuery = (query: { queryKey: QueryKey }): boolean =>
  query.queryKey[2] === "list";

/**
 * Optimistically patches a record by id across every cached list page. A record whose `id` doesn't match (or that has no string/numeric `id` at all) is left untouched the eventual `invalidateQueries` on success still resolves any list this can't safely predict.
 */
export function patchCachedListRecord<TRecord>(
  queryClient: QueryClient,
  keys: ResourceQueryKeys,
  id: string,
  patch: (record: TRecord) => TRecord,
): void {
  queryClient.setQueriesData<ListResponse<TRecord>>(
    { queryKey: keys.all, predicate: isListQuery },
    (data) =>
      data && {
        ...data,
        records: data.records.map((record) =>
          recordId(record) === id ? patch(record) : record,
        ),
      },
  );
}

/** Optimistically removes a record by id from every cached list page. */
export function removeCachedListRecord<TRecord>(
  queryClient: QueryClient,
  keys: ResourceQueryKeys,
  id: string,
): void {
  queryClient.setQueriesData<ListResponse<TRecord>>(
    { queryKey: keys.all, predicate: isListQuery },
    (data) => {
      if (!data) {
        return data;
      }

      const records = data.records.filter((record) => recordId(record) !== id);

      return records.length === data.records.length
        ? data
        : { ...data, records, total: data.total - 1 };
    },
  );
}
