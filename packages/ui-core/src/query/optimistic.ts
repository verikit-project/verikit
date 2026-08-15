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

function isListResponse<TRecord>(
  value: unknown,
): value is ListResponse<TRecord> {
  return (
    typeof value === "object" &&
    value !== null &&
    "records" in value &&
    "total" in value &&
    Array.isArray((value as { records: unknown }).records) &&
    typeof (value as { total: unknown }).total === "number"
  );
}

// Normalize adapter IDs to strings so numeric IDs match the resource contract.
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
 * Restores only the failed optimistic delete to avoid reviving records
 * removed by concurrent mutations.
 */
export function restoreDeletedRecord<TRecord>(
  queryClient: QueryClient,
  snapshot: ResourceQuerySnapshot,
  id: string,
): void {
  for (const [queryKey, previous] of snapshot) {
    if (isListQuery({ queryKey }) && isListResponse<TRecord>(previous)) {
      const deletedRecord = previous.records.find(
        (record) => recordId(record) === id,
      );

      if (!deletedRecord) continue;

      queryClient.setQueryData<ListResponse<TRecord>>(queryKey, (current) => {
        if (
          !current ||
          current.records.some((record) => recordId(record) === id)
        ) {
          return current;
        }

        return {
          ...current,
          records: [...current.records, deletedRecord],
          total: current.total + 1,
        };
      });
      continue;
    }

    if (queryKey[2] === "find" && queryKey[3] === id) {
      queryClient.setQueryData(queryKey, previous);
    }
  }
}

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
