import type { ReactElement, ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import type { RowData } from "@tanstack/react-table";
import { Button } from "#components/button";
import { Input } from "#components/input";
import { cn } from "#lib/utils";
import {
  useResourceTable,
  type UseResourceTableOptions,
  type UseResourceTableSource,
} from "../query/use-resource-table.js";

/** Props for {@link ResourceTable}. */
export interface ResourceTableProps<
  TRecord extends RowData = Record<string, unknown>,
> extends UseResourceTableOptions {
  /** The resource (or its schema) whose fields drive columns, sorting, and paging. */
  resource: UseResourceTableSource;
  /**
   * Renders per-row actions (e.g. edit/delete buttons). Omit to render none 
   * this component makes no decision about which actions an actor may see;
   * that stays the consumer's call.
   */
  renderActions?: (record: TRecord) => ReactNode;
  /** Content shown in place of rows when the list is empty. Defaults to a plain message. */
  emptyState?: ReactNode;
  /** Class name applied to the outer container. */
  className?: string;
}

// `useResourceTable` always sets `header` to `field.label` (a required,
// non-empty string field on every `FieldSchema`), so this always reads a
// plain string back  no function-header or missing-header case to guard.
function headerText(header: {
  column: { columnDef: { header?: unknown } };
}): string {
  return header.column.columnDef.header as string;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") {
    return <ArrowUpIcon className="size-3.5" />;
  }

  if (direction === "desc") {
    return <ArrowDownIcon className="size-3.5" />;
  }

  return <ChevronsUpDownIcon className="size-3.5 opacity-50" />;
}

/**
 * A polished, mobile-friendly table for a single resource: wraps
 * `useResourceTable` with real markup  a search box, sortable headers,
 * pagination, and a stacked card layout below the `md` breakpoint (toggled
 * purely via CSS, so both layouts render server-side)  so a consumer
 * doesn't have to hand-write table markup to use the headless hook. Row
 * actions are opt-in via `renderActions`.
 */
export function ResourceTable<
  TRecord extends RowData = Record<string, unknown>,
>({
  resource,
  pageSize,
  renderActions,
  emptyState,
  className,
}: ResourceTableProps<TRecord>): ReactElement {
  const { table, isLoading, error } = useResourceTable<TRecord>(resource, {
    pageSize,
  });

  // TanStack always returns at least one header group for a mounted table
  // (even with zero registered columns, its `headers` array is just empty),
  // so this is never undefined.
  const headerGroup = table.getHeaderGroups()[0]!;
  const rows = table.getRowModel().rows;
  const columnCount = headerGroup.headers.length + (renderActions ? 1 : 0);
  const resolvedEmptyState = emptyState ?? "No records found.";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <Input
          type="search"
          placeholder="Search..."
          // `useResourceTable` seeds this state via `useState("")`, so
          // it's always a string, never nullish.
          value={table.store.state.globalFilter}
          onChange={(event) => table.setGlobalFilter(event.currentTarget.value)}
          className="max-w-xs"
        />
      </div>

      {error ? (
        <p role="alert" className="pb-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 font-medium">
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {headerText(header)}
                      <SortIcon direction={header.column.getIsSorted()} />
                    </button>
                  ) : (
                    headerText(header)
                  )}
                </th>
              ))}
              {renderActions ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {resolvedEmptyState}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {cellText(cell.getValue())}
                    </td>
                  ))}
                  {renderActions ? (
                    <td className="px-3 py-2 text-right">
                      {renderActions(row.original)}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 md:hidden">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {resolvedEmptyState}
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3">
              {row.getAllCells().map((cell) => (
                <div
                  key={cell.id}
                  className="flex items-center justify-between gap-2 py-1 text-sm"
                >
                  <span className="text-muted-foreground">
                    {headerText({ column: cell.column })}
                  </span>
                  <span className="text-right">
                    {cellText(cell.getValue())}
                  </span>
                </div>
              ))}
              {renderActions ? (
                <div className="flex justify-end gap-2 pt-2">
                  {renderActions(row.original)}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
        <span>
          Page {table.store.state.pagination.pageIndex + 1} of{" "}
          {Math.max(1, table.getPageCount())} · {table.getRowCount()} total
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
