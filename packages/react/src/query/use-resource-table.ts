import { useMemo, useState } from "react";
import {
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import type { ListParams } from "@verikit/client";
import type { FieldSchema, Resource, ResourceSchema } from "@verikit/core";
import { recordId } from "./optimistic.js";
import { resolveVerikitFields } from "../form/use-verikit-form.js";
import { useListResource } from "./use-resource-queries.js";

// Registered once, outside the hook, per TanStack's own guidance  the row
// model stays purely server-driven since no sorted/paginated/filtered row
// model factory is registered here, only the state/handler slices.
// `columnFilteringFeature` is required by `globalFilteringFeature` itself
// (a type-level dependency, not something this hook uses directly). Per-field
// filters are sent straight to the server (see `filters` state below) rather
// than routed through `columnFilteringFeature`'s own state, since its
// single-value-per-column shape can't express range operators like `gte`/`lte`.
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
   * Resolved field schemas backing this table's columns, keyed by field
   * name  the same `filterable`/`fieldType`/`options` metadata a filter UI
   * needs, already resolved once here rather than re-resolved by the caller.
   */
  fields: Record<string, FieldSchema>;
  /** Active per-field filters sent with the list request. */
  filters: ResourceTableFilters;
  /** Replaces the active per-field filters wholesale. */
  setFilters: (filters: ResourceTableFilters) => void;
}

/**
 * The single resource-backed table hook: takes a `Resource` (or its
 * `ResourceSchema`) and wires a headless TanStack Table instance straight to
 * `useListResource`  its own name and fields are the one source of truth
 * for both the columns and which resource to page/sort/search against, so
 * there's no separate column list or name to keep in sync with it. Sorting,
 * pagination, and the search box all drive the server request directly
 * (`manualSorting`/`manualPagination`); there is no client-side row
 * processing to configure.
 */
export function useResourceTable<
  TRecord extends RowData = Record<string, unknown>,
>(
  resource: UseResourceTableSource,
  { pageSize = 25 }: UseResourceTableOptions = {},
): UseResourceTableResult<TRecord> {
  const fields = resolveVerikitFields(resource);

  const columns = useMemo<ColumnDef<ResourceTableFeatures, TRecord>[]>(
    () =>
      Object.values(fields)
        .filter((field) => !field.hidden && !field.tableHidden)
        .map((field) => ({
          accessorKey: field.name,
          header: field.label ?? field.name,
          enableSorting: field.sortable ?? false,
        })),
    [fields],
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [filters, setFilters] = useState<ResourceTableFilters>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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
  });

  const table = useTable({
    features: resourceTableFeatures,
    columns,
    data: list.data?.records ?? [],
    manualSorting: true,
    manualPagination: true,
    rowCount: list.data?.total ?? 0,
    // Row ids default to positional index, which collides across pages (row
    // 0 on page 1 is a different record than row 0 on page 2)  keying by the
    // record's own id keeps `rowSelection` correct as the page changes.
    getRowId: (row, index) => recordId(row) ?? String(index),
    state: { sorting, pagination, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
  });

  return {
    table,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    error: list.error,
    fields,
    filters,
    setFilters,
  };
}
