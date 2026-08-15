import { useState, type ReactElement, type ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import type { RowData } from "@tanstack/react-table";
import { Button } from "#components/button";
import { Checkbox } from "#components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/dialog";
import { Input } from "#components/input";
import { cn } from "#lib/utils";
import { recordId } from "@verikit/ui-core/query/optimistic";
import { useDeleteResource } from "../query/use-resource-mutations.js";
import {
  useResourceTable,
  type UseResourceTableOptions,
  type UseResourceTableSource,
} from "../query/use-resource-table.js";
import { ResourceForm } from "./resource-form.js";
import {
  filterableFields,
  ResourceTableFilterPanel,
} from "./resource-table-filters.js";

/**
 * True for an error whose `status` is 403 (permission denied). Duck-typed on
 * `status`, not `instanceof VerikitClientError`  the same convention that
 * class's own doc comment specifies, for callers distinguishing error cases.
 */
function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 403
  );
}

/** Which built-in row actions a permission-denied response has hidden, keyed by record id. */
type DeniedRowActions = Record<string, { update?: boolean; delete?: boolean }>;

/** Props for {@link ResourceTable}. */
export interface ResourceTableProps<
  TRecord extends RowData = Record<string, unknown>,
> extends UseResourceTableOptions {
  /** The resource (or its schema) whose fields drive columns, sorting, and paging. */
  resource: UseResourceTableSource;
  /**
   * Renders the built-in Create button (opens a `ResourceForm` dialog) and
   * Edit/Delete row actions (Edit opens a `ResourceForm` dialog pre-filled
   * from the row's own data; Delete opens a confirmation dialog backed by
   * `useDeleteResource`).
   *
   * This component has no way to know ahead of time which of those an actor
   * may use  actors never reach the browser (see `ResourceAccess`), so
   * permissions are only ever discovered by attempting the operation. A
   * control whose attempt comes back 403 is hidden for the rest of this
   * component's lifetime rather than shown as a dead end.
   */
  actions?: boolean;
  /**
   * Renders per-row actions (e.g. custom edit/delete buttons). Composed
   * alongside the built-in actions when `actions` is also set, not in place
   * of them.
   */
  renderActions?: (record: TRecord) => ReactNode;
  /**
   * Renders custom actions for the current row selection (e.g. a bulk
   * export button), shown in the selection bar alongside the built-in
   * "Delete selected" action when `actions` is also set. Setting either this
   * or `actions` adds a selection checkbox column. Called with the selected
   * records and a function that clears the selection.
   */
  renderBulkActions?: (
    records: TRecord[],
    clearSelection: () => void,
  ) => ReactNode;
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
 * A responsive resource table with search, sorting, pagination, and a
 * mobile card layout. Standard CRUD actions and custom row actions are opt-in.
 */
export function ResourceTable<
  TRecord extends RowData = Record<string, unknown>,
>({
  resource,
  pageSize,
  actions = false,
  renderActions,
  renderBulkActions,
  emptyState,
  className,
}: ResourceTableProps<TRecord>): ReactElement {
  const { table, isLoading, error, fields, filters, setFilters } =
    useResourceTable<TRecord>(resource, { pageSize });

  const [createOpen, setCreateOpen] = useState(false);
  const [createDenied, setCreateDenied] = useState(false);
  const [editRecord, setEditRecord] = useState<TRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<TRecord | null>(null);
  const [deniedRows, setDeniedRows] = useState<DeniedRowActions>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const deleteMutation = useDeleteResource(resource.name, {
    onError: (mutationError, id) => {
      if (isPermissionDenied(mutationError)) {
        setDeniedRows((current) => ({
          ...current,
          [id]: { ...current[id], delete: true },
        }));
      }
    },
    onSuccess: () => setDeleteRecord(null),
  });

  function openDeleteDialog(record: TRecord): void {
    deleteMutation.reset();
    setDeleteRecord(record);
  }

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedRecords = selectedRows.map((row) => row.original);
  const selectedCount = selectedRows.length;

  function clearSelection(): void {
    table.toggleAllRowsSelected(false);
  }

  function openBulkDeleteDialog(): void {
    setBulkDeleteError(null);
    setBulkDeleteOpen(true);
  }

  async function confirmBulkDelete(): Promise<void> {
    setBulkDeleting(true);
    setBulkDeleteError(null);

    const ids = selectedRecords
      .map((record) => recordId(record))
      .filter((id): id is string => id !== undefined);
    const results = await Promise.allSettled(
      ids.map((id) => deleteMutation.mutateAsync(id)),
    );
    const failedCount = results.filter(
      (result) => result.status === "rejected",
    ).length;

    setBulkDeleting(false);

    if (failedCount > 0) {
      setBulkDeleteError(
        `${failedCount} of ${ids.length} couldn't be deleted.`,
      );
      return;
    }

    setBulkDeleteOpen(false);
    clearSelection();
  }

  function handleEditError(id: string) {
    return (mutationError: Error) => {
      if (isPermissionDenied(mutationError)) {
        setDeniedRows((current) => ({
          ...current,
          [id]: { ...current[id], update: true },
        }));
      }
    };
  }

  function handleCreateError(mutationError: Error): void {
    if (isPermissionDenied(mutationError)) {
      setCreateDenied(true);
    }
  }

  function builtInRowActions(record: TRecord): ReactNode {
    // `ResourceAdapter`'s contract guarantees every record carries a
    // canonical string (or stringifiable numeric) id, same trust boundary
    // `recordId` itself already documents at its other call sites.
    const id = recordId(record)!;
    const denied = deniedRows[id];

    return (
      <>
        {denied?.update ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit"
            onClick={() => setEditRecord(record)}
          >
            <PencilIcon />
          </Button>
        )}
        {denied?.delete ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            onClick={() => openDeleteDialog(record)}
          >
            <Trash2Icon />
          </Button>
        )}
      </>
    );
  }

  // Only called from a `hasActionsColumn ? ... : null` branch below, so
  // `actions`/`renderActions` being both unset here can't happen.
  function rowActions(record: TRecord): ReactNode {
    return (
      <div className="flex items-center justify-end gap-1">
        {actions ? builtInRowActions(record) : null}
        {renderActions ? renderActions(record) : null}
      </div>
    );
  }

  const editId = editRecord ? recordId(editRecord) : undefined;
  const deleteId = deleteRecord ? recordId(deleteRecord) : undefined;
  const hasActionsColumn = actions || Boolean(renderActions);
  const hasSelectionColumn = actions || Boolean(renderBulkActions);
  const hasFilterableFields = filterableFields(fields).length > 0;
  const activeFilterCount = Object.keys(filters).length;

  // TanStack always returns at least one header group for a mounted table
  // (even with zero registered columns, its `headers` array is just empty),
  // so this is never undefined.
  const headerGroup = table.getHeaderGroups()[0]!;
  const rows = table.getRowModel().rows;
  const columnCount =
    headerGroup.headers.length +
    (hasActionsColumn ? 1 : 0) +
    (hasSelectionColumn ? 1 : 0);
  const resolvedEmptyState = emptyState ?? "No records found.";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Search..."
            // `useResourceTable` seeds this state via `useState("")`, so
            // it's always a string, never nullish.
            value={table.store.state.globalFilter}
            onChange={(event) =>
              table.setGlobalFilter(event.currentTarget.value)
            }
            className="max-w-xs"
          />
          {hasFilterableFields ? (
            <Button
              type="button"
              variant={activeFilterCount > 0 ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontalIcon />
              Filters
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          ) : null}
          {activeFilterCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFilters({})}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        {actions && !createDenied ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            New
          </Button>
        ) : null}
      </div>

      {filtersOpen && hasFilterableFields ? (
        <div className="pb-3">
          <ResourceTableFilterPanel
            fields={fields}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      ) : null}

      {selectedCount > 0 ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-2">
            {renderBulkActions
              ? renderBulkActions(selectedRecords, clearSelection)
              : null}
            {actions ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={openBulkDeleteDialog}
              >
                <Trash2Icon />
                Delete selected
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="pb-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {hasSelectionColumn ? (
                <th className="w-8 px-3 py-2">
                  <Checkbox
                    aria-label="Select all rows"
                    checked={
                      rows.length > 0 && table.getIsAllPageRowsSelected()
                    }
                    indeterminate={
                      !table.getIsAllPageRowsSelected() &&
                      table.getIsSomePageRowsSelected()
                    }
                    onCheckedChange={(checked) =>
                      table.toggleAllPageRowsSelected(checked === true)
                    }
                  />
                </th>
              ) : null}
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
              {hasActionsColumn ? <th className="px-3 py-2" /> : null}
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
                  {hasSelectionColumn ? (
                    <td className="px-3 py-2">
                      <Checkbox
                        aria-label="Select row"
                        checked={row.getIsSelected()}
                        onCheckedChange={(checked) =>
                          row.toggleSelected(checked === true)
                        }
                      />
                    </td>
                  ) : null}
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {cellText(cell.getValue())}
                    </td>
                  ))}
                  {hasActionsColumn ? (
                    <td className="px-3 py-2 text-right">
                      {rowActions(row.original)}
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
              {hasSelectionColumn ? (
                <div className="flex justify-end pb-2">
                  <Checkbox
                    aria-label="Select row"
                    checked={row.getIsSelected()}
                    onCheckedChange={(checked) =>
                      row.toggleSelected(checked === true)
                    }
                  />
                </div>
              ) : null}
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
              {hasActionsColumn ? (
                <div className="flex justify-end gap-2 pt-2">
                  {rowActions(row.original)}
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

      {actions ? (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New {resource.name}</DialogTitle>
            </DialogHeader>
            <ResourceForm<TRecord>
              resource={resource}
              onSuccess={() => setCreateOpen(false)}
              onError={handleCreateError}
              submitLabel="Create"
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {actions ? (
        <Dialog
          open={editRecord !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditRecord(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {resource.name}</DialogTitle>
            </DialogHeader>
            {editRecord ? (
              <ResourceForm<TRecord>
                resource={resource}
                // Contract-guaranteed alongside `editRecord`, same trust
                // boundary as `builtInRowActions`' id  see `editId`'s
                // derivation above.
                id={editId!}
                // `TRecord`'s only real constraint is TanStack Table's `RowData`,
                // which imposes no shape - `@verikit/client` records are always
                // plain field maps at runtime, so this cast is safe.
                defaultValues={editRecord as Record<string, unknown>}
                onSuccess={() => setEditRecord(null)}
                onError={handleEditError(editId!)}
                submitLabel="Save changes"
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {actions ? (
        <Dialog
          open={deleteRecord !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteRecord(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this {resource.name}?</DialogTitle>
              <DialogDescription>This can&apos;t be undone.</DialogDescription>
            </DialogHeader>
            {deleteMutation.error &&
            !isPermissionDenied(deleteMutation.error) ? (
              <p role="alert" className="text-sm text-destructive">
                {deleteMutation.error.message}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId!)}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {actions ? (
        <Dialog
          open={bulkDeleteOpen}
          onOpenChange={(open) => {
            if (!open) {
              setBulkDeleteOpen(false);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Delete {selectedCount} {resource.name}?
              </DialogTitle>
              <DialogDescription>This can&apos;t be undone.</DialogDescription>
            </DialogHeader>
            {bulkDeleteError ? (
              <p role="alert" className="text-sm text-destructive">
                {bulkDeleteError}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button
                type="button"
                variant="destructive"
                disabled={bulkDeleting}
                onClick={() => void confirmBulkDelete()}
              >
                {bulkDeleting ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
