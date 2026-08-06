import { useMemo, useState } from "react";
import {
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import type { Resource, ResourceSchema } from "@verikit/core";
import { resolveVerikitFields } from "../form/use-verikit-form.js";
import { useListResource } from "./use-resource-queries.js";

// Registered once, outside the hook, per TanStack's own guidance — the row
// model stays purely server-driven since no sorted/paginated/filtered row
// model factory is registered here, only the state/handler slices.
// `columnFilteringFeature` is required by `globalFilteringFeature` itself
// (a type-level dependency, not something this hook uses directly).
const resourceTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnFilteringFeature,
  globalFilteringFeature,
});

type ResourceTableFeatures = typeof resourceTableFeatures;

/** A resource builder or its finalized schema — either carries its own name. */
export type UseResourceTableSource = Resource | ResourceSchema;

/** Options for creating a resource-backed table. */
export interface UseResourceTableOptions {
  /** Initial page size, before the user (or caller) changes it. Defaults to 25. */
  pageSize?: number;
}

/** State and helpers returned by {@link useResourceTable}. */
export interface UseResourceTableResult<
  TRecord extends RowData = Record<string, unknown>,
> {
  /** The TanStack Table instance — headless: render your own markup from it. */
  table: Table<ResourceTableFeatures, TRecord>;
  /** Whether the current page's initial fetch is still in flight. */
  isLoading: boolean;
  /** Whether a fetch (initial or background) is currently in flight. */
  isFetching: boolean;
  /** Error from the underlying list request, if any. */
  error: Error | null;
}

/**
 * The single resource-backed table hook: takes a `Resource` (or its
 * `ResourceSchema`) and wires a headless TanStack Table instance straight to
 * `useListResource` — its own name and fields are the one source of truth
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
        .filter((field) => !field.hidden)
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

  const activeSort = sorting[0];

  const list = useListResource<TRecord>(resource.name, {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: globalFilter || undefined,
    sort: activeSort
      ? { field: activeSort.id, direction: activeSort.desc ? "desc" : "asc" }
      : undefined,
  });

  const table = useTable({
    features: resourceTableFeatures,
    columns,
    data: list.data?.records ?? [],
    manualSorting: true,
    manualPagination: true,
    rowCount: list.data?.total ?? 0,
    state: { sorting, pagination, globalFilter },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
  });

  return {
    table,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    error: list.error,
  };
}
