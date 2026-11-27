import { useMemo, useState } from "react";
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
} from "@tanstack/react-table";
import type {
  ListActionAvailability,
  ListParams,
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
import { useListResource } from "./use-resource-queries.js";

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
  isLoading: boolean;
  /** Whether a fetch (initial or background) is currently in flight. */
  isFetching: boolean;
  /** Error from the underlying list request, if any. */
  error: Error | null;
  /**
   * Resolved field schemas for table columns, including metadata used by filters.
   */
  fields: Record<string, FieldSchema>;
  /** Active per-field filters sent with the list request. */
  filters: ResourceTableFilters;
  /** Replaces the active per-field filters wholesale. */
  setFilters: (filters: ResourceTableFilters) => void;
  /** The actions the actor can't run on the current page, when requested with `includeActions`. */
  actions: ListActionAvailability | undefined;
  /** Display labels for the current page's `belongsTo` relationships, when the resource has any to show. */
  relationships: RelationshipLabels | undefined;
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
  const fields = resolveVerikitFields(resource);
  const columnSpecs = useMemo(() => resourceColumnSpecs(resource), [resource]);
  const includeRelationships = useMemo(
    () => needsRelationshipLabels(resource),
    [resource],
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [filters, setFilters] = useState<ResourceTableFilters>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Reset to page 1 when filters or search change to avoid empty stale pages.
  const resetToFirstPage = () =>
    setPagination((old) =>
      old.pageIndex === 0 ? old : { ...old, pageIndex: 0 },
    );

  const handleGlobalFilterChange: OnChangeFn<string> = (updater) => {
    setGlobalFilter((old) => functionalUpdate(updater, old));
    resetToFirstPage();
  };

  const handleFiltersChange = (next: ResourceTableFilters): void => {
    setFilters(next);
    resetToFirstPage();
  };

  const activeSort = sorting[0];
  const hasFilters = Object.keys(filters).length > 0;

  const list = useListResource<TRecord>(resource.name, {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: globalFilter || undefined,
    sort: activeSort
      ? { field: activeSort.id, direction: activeSort.desc ? "desc" : "asc" }
      : undefined,
    ...(hasFilters ? { filters } : {}),
    ...(includeActions ? { includeActions } : {}),
    ...(includeRelationships ? { includeRelationships } : {}),
  } as ListParams<TRecord>);
  const relationships = list.data?.relationships;

  const columns = useMemo<ColumnDef<ResourceTableFeatures, TRecord>[]>(
    () =>
      columnSpecs.map((spec) =>
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
                  relationships,
                  spec,
                  record as Record<string, unknown>,
                ),
              header: spec.label,
              // Sorting by a foreign key wouldn't follow the labels shown.
              enableSorting: false,
            },
      ),
    [columnSpecs, relationships],
  );

  const table = useTable({
    features: resourceTableFeatures,
    columns,
    data: list.data?.records ?? [],
    manualSorting: true,
    manualPagination: true,
    rowCount: list.data?.total ?? 0,
    // Use record IDs so row selection remains stable across paginated pages.
    getRowId: (row, index) => recordId(row) ?? String(index),
    state: { sorting, pagination, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: handleGlobalFilterChange,
    onRowSelectionChange: setRowSelection,
  });

  return {
    table,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    error: list.error,
    fields,
    filters,
    setFilters: handleFiltersChange,
    actions: list.data?.actions,
    relationships,
  };
}
