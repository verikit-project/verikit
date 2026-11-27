import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { BelongsToRelationshipSchema } from "@verikit/core";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";
import { useVerikitClient } from "../client/use-verikit-client.js";
import { useResourceRelationship } from "../query/use-resource-queries.js";

/** Records fetched per page as the picker's list is scrolled through. */
export const RELATIONSHIP_PICKER_PAGE_SIZE = 25;

/** How long the picker waits after the last keystroke before searching. */
export const RELATIONSHIP_SEARCH_DEBOUNCE_MS = 250;

type PickerRecord = Record<string, unknown>;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function recordId(record: PickerRecord): string {
  return String(record.id);
}

/** A record's label: its `displayField` value, or its id when that's empty. */
export function relationshipRecordLabel(
  record: PickerRecord,
  displayField: string | undefined,
): string {
  const raw = displayField ? record[displayField] : undefined;

  return raw === null || raw === undefined ? recordId(record) : String(raw);
}

/** Options for {@link useRelationshipPicker}. */
export interface UseRelationshipPickerOptions {
  /** Resource that owns the relationship; options come from its picker route. */
  resourceName: string;
  relationship: BelongsToRelationshipSchema;
  /** The selected record's id, or `""` for none. */
  value: string;
  /** The text typed into the picker, searched after a short pause. */
  search: string;
}

/** State returned by {@link useRelationshipPicker}. */
export interface UseRelationshipPickerResult {
  /** Ids of the loaded options, in server order. */
  ids: string[];
  /** Label for an id: loaded, or looked up for the selected value. */
  labelFor: (id: string) => string;
  isLoading: boolean;
  error: Error | null;
  /** True when the server has more matching records than are loaded. */
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
}

/**
 * Loads a `belongsTo` picker's options from the server: searched by what's
 * typed (the server searches the target's `displayField` and `.searchable()`
 * fields), a page at a time. When the selected record isn't among the loaded
 * options, it is fetched by id so its label can still be shown.
 */
export function useRelationshipPicker({
  resourceName,
  relationship,
  value,
  search,
}: UseRelationshipPickerOptions): UseRelationshipPickerResult {
  const client = useVerikitClient();
  const relationshipName = relationship.name ?? "";
  const enabled = relationshipName.length > 0;
  const term = useDebouncedValue(
    search.trim(),
    RELATIONSHIP_SEARCH_DEBOUNCE_MS,
  );
  const params = {
    pageSize: RELATIONSHIP_PICKER_PAGE_SIZE,
    ...(term && { search: term }),
  };

  const pages = useInfiniteQuery({
    queryKey: resourceQueryKeys(resourceName, client).relationshipPages(
      relationshipName,
      params,
    ),
    queryFn: ({ pageParam, signal }) =>
      client
        .resource(resourceName)
        .relationship<PickerRecord>(
          relationshipName,
          { ...params, page: pageParam },
          { signal },
        ),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      all.reduce((count, page) => count + page.records.length, 0) <
        last.total && last.records.length > 0
        ? last.page + 1
        : undefined,
    enabled,
  });

  const records = useMemo(
    () => pages.data?.pages.flatMap((page) => page.records) ?? [],
    [pages.data],
  );
  const loaded = records.some((record) => recordId(record) === value);
  const selected = useResourceRelationship<PickerRecord>(
    resourceName,
    relationshipName,
    { ids: [value], pageSize: 1 },
    { enabled: enabled && value !== "" && !loaded && pages.isSuccess },
  );

  const labels = useMemo(() => {
    const map = new Map<string, string>();

    for (const record of [...(selected.data?.records ?? []), ...records]) {
      map.set(
        recordId(record),
        relationshipRecordLabel(record, relationship.displayField),
      );
    }

    return map;
  }, [records, selected.data, relationship.displayField]);

  return {
    ids: [...new Set(records.map(recordId))],
    labelFor: (id) => labels.get(id) ?? id,
    isLoading: pages.isLoading,
    error: pages.error,
    hasMore: pages.hasNextPage,
    isLoadingMore: pages.isFetchingNextPage,
    loadMore: () => void pages.fetchNextPage(),
  };
}
