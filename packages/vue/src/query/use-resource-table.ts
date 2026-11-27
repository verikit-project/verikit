import {
  columnFilteringFeature,
  functionalUpdate,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table,
} from "@tanstack/vue-table";
import { useQuery, type UseQueryReturnType } from "@tanstack/vue-query";
import type {
  ListActionAvailability,
  ListParams,
  ListResponse,
  RelationshipLabels,
} from "@verikit/client";
import type { FieldSchema, Resource, ResourceSchema } from "@verikit/core";
import { recordId } from "@verikit/ui-core/query/optimistic";
import { resolveVerikitFields } from "@verikit/ui-core/form/resolve-fields";
import {
  needsRelationshipLabels,
  relationshipCellText,
  resourceColumnSpecs,
} from "@verikit/ui-core/layout/table-columns";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";
import { computed, ref, type ComputedRef, type Ref } from "vue";
import { useVerikitClient } from "../client/use-verikit-client.js";

// `columnFilteringFeature` is required by TanStack's global filtering feature.
// VeriKit manages field filters separately to support range operators.
const resourceTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnFilteringFeature,
  globalFilteringFeature,
});

type ResourceTableFeatures = typeof resourceTableFeatures;

/** A resource builder or its finalized schema  either carries its own name. */
export type UseResourceTableSource = Resource | ResourceSchema;

/** Active per-field filters, keyed by field name  the same shape `ListParams.filters` sends to the server. */
export type ResourceTableFilters = NonNullable<ListParams["filters"]>;

/** Options for creating a resource-backed table. */
export interface UseResourceTableOptions {
  /** Initial page size, before the user (or caller) changes it. Defaults to 25. */
  pageSize?: number;
  /**
   * Also asks the server which actions the actor can't run on each page, returned as `actions`. Each action's permissions and availability guard run per record, so only set this when the actions are shown.
   */
  includeActions?: boolean;
}

/** State and helpers returned by {@link useResourceTable}. */
export interface UseResourceTableResult<
  TRecord extends RowData = Record<string, unknown>,
> {
  /** The TanStack Table instance  headless: render your own markup from it. */
  table: Table<ResourceTableFeatures, TRecord>;
  /** Whether the current page's initial fetch is still in flight. */
  isLoading: UseQueryReturnType<ListResponse<TRecord>, Error>["isLoading"];
  /** Whether a fetch (initial or background) is currently in flight. */
  isFetching: UseQueryReturnType<ListResponse<TRecord>, Error>["isFetching"];
  /** Error from the underlying list request, if any. */
  error: UseQueryReturnType<ListResponse<TRecord>, Error>["error"];
  /**
   * Resolved field schemas for table columns, including metadata used by filters.
   */
  fields: Record<string, FieldSchema>;
  /** Active per-field filters sent with the list request. */
  filters: Ref<ResourceTableFilters>;
  /** Replaces the active per-field filters wholesale. */
  setFilters: (filters: ResourceTableFilters) => void;
  /** The actions the actor can't run on the current page, when requested with `includeActions`. */
  actions: ComputedRef<ListActionAvailability | undefined>;
  /** Display labels for the current page's `belongsTo` relationships, when the resource has any to show. */
  relationships: ComputedRef<RelationshipLabels | undefined>;
}

/**
 * Creates a TanStack Table from a resource's schema, with automatic columns
 * and server-side pagination, sorting, and search. A `belongsTo`
 * relationship gets a column in place of its foreign-key field, showing the
 * related record's `displayField` (fetched with the page, one query per
 * relationship on the server), or the raw key when there's no label.
 */
export function useResourceTable<
  TRecord extends RowData = Record<string, unknown>,
>(
  resource: UseResourceTableSource,
  { pageSize = 25, includeActions = false }: UseResourceTableOptions = {},
): UseResourceTableResult<TRecord> {
  const client = useVerikitClient();
  const fields = resolveVerikitFields(resource);
  const columnSpecs = resourceColumnSpecs(resource);
  const includeRelationships = needsRelationshipLabels(resource);

  const sorting = ref<SortingState>([]);
  const pagination = ref<PaginationState>({ pageIndex: 0, pageSize });
  const globalFilter = ref("");
  const filters = ref<ResourceTableFilters>({});
  const rowSelection = ref<RowSelectionState>({});

  // Reset to page 1 when filters or search change to avoid empty stale pages.
  function resetToFirstPage(): void {
    if (pagination.value.pageIndex !== 0) {
      pagination.value = { ...pagination.value, pageIndex: 0 };
    }
  }

  const handleGlobalFilterChange: OnChangeFn<string> = (updater) => {
    globalFilter.value = functionalUpdate(updater, globalFilter.value);
    resetToFirstPage();
  };

  function handleFiltersChange(next: ResourceTableFilters): void {
    filters.value = next;
    resetToFirstPage();
  }

  const listParams = computed<ListParams<TRecord>>(() => {
    const activeSort = sorting.value[0];
    const hasFilters = Object.keys(filters.value).length > 0;

    return {
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      search: globalFilter.value || undefined,
      sort: activeSort
        ? { field: activeSort.id, direction: activeSort.desc ? "desc" : "asc" }
        : undefined,
      ...(hasFilters ? { filters: filters.value } : {}),
      ...(includeActions ? { includeActions } : {}),
      ...(includeRelationships ? { includeRelationships } : {}),
    } as ListParams<TRecord>;
  });

  const list = useQuery({
    queryKey: computed(() =>
      resourceQueryKeys(resource.name, client).list(listParams.value),
    ),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client
        .resource<TRecord>(resource.name)
        .list(listParams.value, { signal }),
  });
  const relationships = computed(() => list.data.value?.relationships);

  const columns = computed<ColumnDef<ResourceTableFeatures, TRecord>[]>(() => {
    const labels = relationships.value;

    return columnSpecs.map((spec) =>
      spec.kind === "field"
        ? {
            accessorKey: spec.field.name,
            header: spec.field.label ?? spec.field.name,
            enableSorting: spec.field.sortable ?? false,
          }
        : {
            id: spec.name,
            // Records are plain field maps at runtime (see `ResourceTable`).
            accessorFn: (record: TRecord) =>
              relationshipCellText(
                labels,
                spec,
                record as Record<string, unknown>,
              ),
            header: spec.label,
            // Sorting by a foreign key wouldn't follow the labels shown.
            enableSorting: false,
          },
    );
  });

  const table = useTable({
    features: resourceTableFeatures,
    columns,
    data: computed(() => list.data.value?.records ?? []),
    manualSorting: true,
    manualPagination: true,
    rowCount: computed(() => list.data.value?.total ?? 0),
    // Use record IDs so row selection remains stable across paginated pages.
    getRowId: (row: TRecord, index: number) => recordId(row) ?? String(index),
    state: computed(() => ({
      sorting: sorting.value,
      pagination: pagination.value,
      globalFilter: globalFilter.value,
      rowSelection: rowSelection.value,
    })),
    onSortingChange: (updater) => {
      sorting.value = functionalUpdate(updater, sorting.value);
    },
    onPaginationChange: (updater) => {
      pagination.value = functionalUpdate(updater, pagination.value);
    },
    onGlobalFilterChange: handleGlobalFilterChange,
    onRowSelectionChange: (updater) => {
      rowSelection.value = functionalUpdate(updater, rowSelection.value);
    },
  });

  return {
    table,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    error: list.error,
    fields,
    filters,
    setFilters: handleFiltersChange,
    actions: computed(() => list.data.value?.actions),
    relationships,
  };
}
