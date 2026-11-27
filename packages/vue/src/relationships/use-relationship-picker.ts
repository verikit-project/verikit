import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import type { ListParams } from "@verikit/client";
import type { BelongsToRelationshipSchema } from "@verikit/core";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";
import {
  computed,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";
import { useVerikitClient } from "../client/use-verikit-client.js";

/** Records fetched per page as the picker's list is scrolled through. */
export const RELATIONSHIP_PICKER_PAGE_SIZE = 25;

/** How long the picker waits after the last keystroke before searching. */
export const RELATIONSHIP_SEARCH_DEBOUNCE_MS = 250;

type PickerRecord = Record<string, unknown>;

function useDebouncedValue<T>(
  source: MaybeRefOrGetter<T>,
  delay: number,
): Ref<T> {
  const debounced = ref(toValue(source)) as Ref<T>;

  watch(
    () => toValue(source),
    (value, _previous, onCleanup) => {
      const timer = setTimeout(() => {
        debounced.value = value;
      }, delay);
      onCleanup(() => clearTimeout(timer));
    },
  );

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
  value: MaybeRefOrGetter<string>;
  /** The text typed into the picker, searched after a short pause. */
  search: MaybeRefOrGetter<string>;
}

/** State returned by {@link useRelationshipPicker}. */
export interface UseRelationshipPickerResult {
  /** Ids of the loaded options, in server order. */
  ids: ComputedRef<string[]>;
  /** Label for an id: loaded, or looked up for the selected value. */
  labelFor: (id: string) => string;
  isLoading: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  /** True when the server has more matching records than are loaded. */
  hasMore: ComputedRef<boolean>;
  isLoadingMore: ComputedRef<boolean>;
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
  const keys = resourceQueryKeys(resourceName, client);
  const relationshipName = relationship.name ?? "";
  const enabled = relationshipName.length > 0;
  const term = useDebouncedValue(
    () => toValue(search).trim(),
    RELATIONSHIP_SEARCH_DEBOUNCE_MS,
  );
  const params = computed<ListParams>(() => ({
    pageSize: RELATIONSHIP_PICKER_PAGE_SIZE,
    ...(term.value && { search: term.value }),
  }));

  const pages = useInfiniteQuery({
    queryKey: computed(() =>
      keys.relationshipPages(relationshipName, params.value),
    ),
    queryFn: ({ pageParam, signal }) =>
      client
        .resource(resourceName)
        .relationship<PickerRecord>(
          relationshipName,
          { ...params.value, page: pageParam },
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

  const records = computed(
    () => pages.data.value?.pages.flatMap((page) => page.records) ?? [],
  );
  const loaded = computed(() =>
    records.value.some((record) => recordId(record) === toValue(value)),
  );
  const selectedParams = computed<ListParams>(() => ({
    ids: [toValue(value)],
    pageSize: 1,
  }));
  const selected = useQuery({
    queryKey: computed(() =>
      keys.relationship(relationshipName, selectedParams.value),
    ),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client
        .resource(resourceName)
        .relationship<PickerRecord>(relationshipName, selectedParams.value, {
          signal,
        }),
    enabled: computed(
      () =>
        enabled &&
        toValue(value) !== "" &&
        !loaded.value &&
        pages.isSuccess.value,
    ),
  });

  const labels = computed(() => {
    const map = new Map<string, string>();

    for (const record of [
      ...(selected.data.value?.records ?? []),
      ...records.value,
    ]) {
      map.set(
        recordId(record),
        relationshipRecordLabel(record, relationship.displayField),
      );
    }

    return map;
  });

  return {
    ids: computed(() => [...new Set(records.value.map(recordId))]),
    labelFor: (id) => labels.value.get(id) ?? id,
    isLoading: computed(() => pages.isLoading.value),
    error: computed(() => pages.error.value),
    hasMore: computed(() => pages.hasNextPage.value),
    isLoadingMore: computed(() => pages.isFetchingNextPage.value),
    loadMore: () => void pages.fetchNextPage(),
  };
}
