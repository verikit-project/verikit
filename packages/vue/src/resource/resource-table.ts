import { defineComponent, h, ref, type PropType, type VNodeChild } from "vue";
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
} from "lucide-vue-next";
import type { RowData } from "@tanstack/vue-table";
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
 * `status`, not `instanceof VerikitClientError`.
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
   * Edit/Delete row actions.
   */
  actions?: boolean;
  /** Renders per-row actions (e.g. custom edit/delete buttons). */
  renderActions?: (record: TRecord) => VNodeChild;
  /** Renders custom actions for the current row selection. */
  renderBulkActions?: (
    records: TRecord[],
    clearSelection: () => void,
  ) => VNodeChild;
  /** Content shown in place of rows when the list is empty. Defaults to a plain message. */
  emptyState?: VNodeChild;
  /** Class name applied to the outer container. */
  className?: string;
}

// `header` is always the field's required string label.
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

function sortIcon(direction: false | "asc" | "desc") {
  if (direction === "asc") {
    return h(ArrowUpIcon, { class: "size-3.5" });
  }

  if (direction === "desc") {
    return h(ArrowDownIcon, { class: "size-3.5" });
  }

  return h(ChevronsUpDownIcon, { class: "size-3.5 opacity-50" });
}

/**
 * A responsive resource table with search, sorting, pagination, and a
 * mobile card layout. Standard CRUD actions and custom row actions are opt-in.
 */
export const ResourceTable = defineComponent({
  name: "ResourceTable",
  props: {
    resource: {
      type: Object as PropType<UseResourceTableSource>,
      required: true,
    },
    pageSize: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    actions: { type: Boolean, default: false },
    renderActions: {
      type: Function as PropType<ResourceTableProps["renderActions"]>,
      default: undefined,
    },
    renderBulkActions: {
      type: Function as PropType<ResourceTableProps["renderBulkActions"]>,
      default: undefined,
    },
    emptyState: {
      type: null as unknown as PropType<VNodeChild>,
      required: false,
    },
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    type TRecord = Record<string, unknown>;

    const { table, isLoading, error, fields, filters, setFilters } =
      useResourceTable<TRecord>(props.resource, { pageSize: props.pageSize });

    const createOpen = ref(false);
    const createDenied = ref(false);
    const editRecord = ref<TRecord | null>(null);
    const deleteRecord = ref<TRecord | null>(null);
    const deniedRows = ref<DeniedRowActions>({});
    const filtersOpen = ref(false);
    const bulkDeleteOpen = ref(false);
    const bulkDeleteError = ref<string | null>(null);
    const bulkDeleting = ref(false);

    const deleteMutation = useDeleteResource(props.resource.name, {
      onError: (mutationError: Error, id: string) => {
        if (isPermissionDenied(mutationError)) {
          deniedRows.value = {
            ...deniedRows.value,
            [id]: { ...deniedRows.value[id], delete: true },
          };
        }
      },
      onSuccess: () => {
        deleteRecord.value = null;
      },
    });

    function openDeleteDialog(record: TRecord): void {
      deleteMutation.reset();
      deleteRecord.value = record;
    }

    function clearSelection(): void {
      table.toggleAllRowsSelected(false);
    }

    function openBulkDeleteDialog(): void {
      bulkDeleteError.value = null;
      bulkDeleteOpen.value = true;
    }

    async function confirmBulkDelete(): Promise<void> {
      bulkDeleting.value = true;
      bulkDeleteError.value = null;

      const selectedRecords = table
        .getSelectedRowModel()
        .rows.map((row) => row.original);
      const ids = selectedRecords
        .map((record) => recordId(record))
        .filter((id): id is string => id !== undefined);
      const results = await Promise.allSettled(
        ids.map((id) => deleteMutation.mutateAsync(id)),
      );
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;

      bulkDeleting.value = false;

      if (failedCount > 0) {
        bulkDeleteError.value = `${failedCount} of ${ids.length} couldn't be deleted.`;
        return;
      }

      bulkDeleteOpen.value = false;
      clearSelection();
    }

    function handleEditError(id: string) {
      return (mutationError: Error) => {
        if (isPermissionDenied(mutationError)) {
          deniedRows.value = {
            ...deniedRows.value,
            [id]: { ...deniedRows.value[id], update: true },
          };
        }
      };
    }

    function handleCreateError(mutationError: Error): void {
      if (isPermissionDenied(mutationError)) {
        createDenied.value = true;
      }
    }

    function builtInRowActions(record: TRecord): VNodeChild {
      const id = recordId(record)!;
      const denied = deniedRows.value[id];

      return [
        denied?.update
          ? null
          : h(
              Button,
              {
                type: "button",
                variant: "ghost",
                size: "icon-sm",
                "aria-label": "Edit",
                onClick: () => {
                  editRecord.value = record;
                },
              },
              { default: () => h(PencilIcon) },
            ),
        denied?.delete
          ? null
          : h(
              Button,
              {
                type: "button",
                variant: "ghost",
                size: "icon-sm",
                "aria-label": "Delete",
                onClick: () => openDeleteDialog(record),
              },
              { default: () => h(Trash2Icon) },
            ),
      ];
    }

    function rowActions(record: TRecord): VNodeChild {
      return h("div", { class: "flex items-center justify-end gap-1" }, [
        props.actions ? builtInRowActions(record) : null,
        props.renderActions ? props.renderActions(record) : null,
      ]);
    }

    return () => {
      const selectedRows = table.getSelectedRowModel().rows;
      const selectedRecords = selectedRows.map((row) => row.original);
      const selectedCount = selectedRows.length;
      const editId = editRecord.value ? recordId(editRecord.value) : undefined;
      const deleteId = deleteRecord.value
        ? recordId(deleteRecord.value)
        : undefined;
      const hasActionsColumn = props.actions || Boolean(props.renderActions);
      const hasSelectionColumn =
        props.actions || Boolean(props.renderBulkActions);
      const hasFilterableFields = filterableFields(fields).length > 0;
      const activeFilterCount = Object.keys(filters.value).length;

      // TanStack always returns at least one header group for a mounted table
      // (even with zero registered columns, its `headers` array is just empty).
      const headerGroup = table.getHeaderGroups()[0]!;
      const rows = table.getRowModel().rows;
      const columnCount =
        headerGroup.headers.length +
        (hasActionsColumn ? 1 : 0) +
        (hasSelectionColumn ? 1 : 0);
      const resolvedEmptyState = props.emptyState ?? "No records found.";

      return h("div", { class: cn("w-full", props.className) }, [
        h("div", { class: "flex items-center justify-between gap-2 pb-3" }, [
          h("div", { class: "flex items-center gap-2" }, [
            h(Input, {
              type: "search",
              placeholder: "Search...",
              value: table.store.state.globalFilter,
              onInput: (event: Event) =>
                table.setGlobalFilter((event.target as HTMLInputElement).value),
              class: "max-w-xs",
            }),
            hasFilterableFields
              ? h(
                  Button,
                  {
                    type: "button",
                    variant: activeFilterCount > 0 ? "secondary" : "outline",
                    size: "sm",
                    onClick: () => {
                      filtersOpen.value = !filtersOpen.value;
                    },
                    "aria-expanded": filtersOpen.value,
                  },
                  {
                    default: () => [
                      h(SlidersHorizontalIcon),
                      "Filters",
                      activeFilterCount > 0 ? ` (${activeFilterCount})` : "",
                    ],
                  },
                )
              : null,
            activeFilterCount > 0
              ? h(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    onClick: () => setFilters({}),
                  },
                  { default: () => "Clear filters" },
                )
              : null,
          ]),
          props.actions && !createDenied.value
            ? h(
                Button,
                {
                  type: "button",
                  size: "sm",
                  onClick: () => {
                    createOpen.value = true;
                  },
                },
                { default: () => [h(PlusIcon), "New"] },
              )
            : null,
        ]),

        filtersOpen.value && hasFilterableFields
          ? h("div", { class: "pb-3" }, [
              h(ResourceTableFilterPanel, {
                fields,
                filters: filters.value,
                onFiltersChange: setFilters,
              }),
            ])
          : null,

        selectedCount > 0
          ? h(
              "div",
              {
                class:
                  "mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2",
              },
              [
                h(
                  "span",
                  { class: "text-sm text-muted-foreground" },
                  `${selectedCount} selected`,
                ),
                h("div", { class: "flex items-center gap-2" }, [
                  props.renderBulkActions
                    ? props.renderBulkActions(selectedRecords, clearSelection)
                    : null,
                  props.actions
                    ? h(
                        Button,
                        {
                          type: "button",
                          variant: "destructive",
                          size: "sm",
                          onClick: openBulkDeleteDialog,
                        },
                        { default: () => [h(Trash2Icon), "Delete selected"] },
                      )
                    : null,
                  h(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      onClick: clearSelection,
                    },
                    { default: () => "Clear" },
                  ),
                ]),
              ],
            )
          : null,

        error.value
          ? h(
              "p",
              { role: "alert", class: "pb-3 text-sm text-destructive" },
              error.value.message,
            )
          : null,

        h(
          "div",
          {
            class:
              "hidden overflow-x-auto rounded-lg border border-border md:block",
          },
          [
            h("table", { class: "w-full text-left text-sm" }, [
              h("thead", { class: "bg-muted/50 text-muted-foreground" }, [
                h("tr", {}, [
                  hasSelectionColumn
                    ? h("th", { class: "w-8 px-3 py-2" }, [
                        h(Checkbox, {
                          "aria-label": "Select all rows",
                          checked:
                            rows.length > 0 && table.getIsAllPageRowsSelected(),
                          indeterminate:
                            !table.getIsAllPageRowsSelected() &&
                            table.getIsSomePageRowsSelected(),
                          onCheckedChange: (checked: boolean) =>
                            table.toggleAllPageRowsSelected(checked === true),
                        }),
                      ])
                    : null,
                  ...headerGroup.headers.map((header) =>
                    h(
                      "th",
                      { key: header.id, class: "px-3 py-2 font-medium" },
                      [
                        header.column.getCanSort()
                          ? h(
                              "button",
                              {
                                type: "button",
                                class:
                                  "inline-flex items-center gap-1 hover:text-foreground",
                                onClick:
                                  header.column.getToggleSortingHandler(),
                              },
                              [
                                headerText(header),
                                sortIcon(header.column.getIsSorted()),
                              ],
                            )
                          : headerText(header),
                      ],
                    ),
                  ),
                  hasActionsColumn ? h("th", { class: "px-3 py-2" }) : null,
                ]),
              ]),
              h("tbody", {}, [
                isLoading.value
                  ? h("tr", {}, [
                      h(
                        "td",
                        {
                          colspan: columnCount,
                          class: "px-3 py-6 text-center text-muted-foreground",
                        },
                        "Loading…",
                      ),
                    ])
                  : rows.length === 0
                    ? h("tr", {}, [
                        h(
                          "td",
                          {
                            colspan: columnCount,
                            class:
                              "px-3 py-6 text-center text-muted-foreground",
                          },
                          resolvedEmptyState,
                        ),
                      ])
                    : rows.map((row) =>
                        h(
                          "tr",
                          { key: row.id, class: "border-t border-border" },
                          [
                            hasSelectionColumn
                              ? h("td", { class: "px-3 py-2" }, [
                                  h(Checkbox, {
                                    "aria-label": "Select row",
                                    checked: row.getIsSelected(),
                                    onCheckedChange: (checked: boolean) =>
                                      row.toggleSelected(checked === true),
                                  }),
                                ])
                              : null,
                            ...row
                              .getAllCells()
                              .map((cell) =>
                                h(
                                  "td",
                                  { key: cell.id, class: "px-3 py-2" },
                                  cellText(cell.getValue()),
                                ),
                              ),
                            hasActionsColumn
                              ? h("td", { class: "px-3 py-2 text-right" }, [
                                  rowActions(row.original),
                                ])
                              : null,
                          ],
                        ),
                      ),
              ]),
            ]),
          ],
        ),

        h("div", { class: "grid gap-2 md:hidden" }, [
          isLoading.value
            ? h(
                "p",
                { class: "py-6 text-center text-sm text-muted-foreground" },
                "Loading…",
              )
            : rows.length === 0
              ? h(
                  "p",
                  { class: "py-6 text-center text-sm text-muted-foreground" },
                  resolvedEmptyState,
                )
              : rows.map((row) =>
                  h(
                    "div",
                    {
                      key: row.id,
                      class: "rounded-lg border border-border p-3",
                    },
                    [
                      hasSelectionColumn
                        ? h("div", { class: "flex justify-end pb-2" }, [
                            h(Checkbox, {
                              "aria-label": "Select row",
                              checked: row.getIsSelected(),
                              onCheckedChange: (checked: boolean) =>
                                row.toggleSelected(checked === true),
                            }),
                          ])
                        : null,
                      ...row.getAllCells().map((cell) =>
                        h(
                          "div",
                          {
                            key: cell.id,
                            class:
                              "flex items-center justify-between gap-2 py-1 text-sm",
                          },
                          [
                            h(
                              "span",
                              { class: "text-muted-foreground" },
                              headerText({ column: cell.column }),
                            ),
                            h(
                              "span",
                              { class: "text-right" },
                              cellText(cell.getValue()),
                            ),
                          ],
                        ),
                      ),
                      hasActionsColumn
                        ? h("div", { class: "flex justify-end gap-2 pt-2" }, [
                            rowActions(row.original),
                          ])
                        : null,
                    ],
                  ),
                ),
        ]),

        h(
          "div",
          {
            class:
              "flex items-center justify-between pt-3 text-sm text-muted-foreground",
          },
          [
            h(
              "span",
              {},
              `Page ${table.store.state.pagination.pageIndex + 1} of ${Math.max(1, table.getPageCount())} · ${table.getRowCount()} total`,
            ),
            h("div", { class: "flex gap-1" }, [
              h(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "icon-sm",
                  disabled: !table.getCanPreviousPage(),
                  onClick: () => table.previousPage(),
                  "aria-label": "Previous page",
                },
                { default: () => h(ChevronLeftIcon) },
              ),
              h(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "icon-sm",
                  disabled: !table.getCanNextPage(),
                  onClick: () => table.nextPage(),
                  "aria-label": "Next page",
                },
                { default: () => h(ChevronRightIcon) },
              ),
            ]),
          ],
        ),

        props.actions
          ? h(
              Dialog,
              {
                open: createOpen.value,
                onOpenChange: (open: boolean) => {
                  createOpen.value = open;
                },
              },
              {
                default: () =>
                  h(
                    DialogContent,
                    {},
                    {
                      default: () => [
                        h(
                          DialogHeader,
                          {},
                          {
                            default: () =>
                              h(
                                DialogTitle,
                                {},
                                { default: () => `New ${props.resource.name}` },
                              ),
                          },
                        ),
                        h(ResourceForm, {
                          resource: props.resource,
                          onSuccess: () => {
                            createOpen.value = false;
                          },
                          onError: handleCreateError,
                          submitLabel: "Create",
                        }),
                      ],
                    },
                  ),
              },
            )
          : null,

        props.actions
          ? h(
              Dialog,
              {
                open: editRecord.value !== null,
                onOpenChange: (open: boolean) => {
                  if (!open) {
                    editRecord.value = null;
                  }
                },
              },
              {
                default: () =>
                  h(
                    DialogContent,
                    {},
                    {
                      default: () => [
                        h(
                          DialogHeader,
                          {},
                          {
                            default: () =>
                              h(
                                DialogTitle,
                                {},
                                {
                                  default: () => `Edit ${props.resource.name}`,
                                },
                              ),
                          },
                        ),
                        editRecord.value
                          ? h(ResourceForm, {
                              resource: props.resource,
                              id: editId!,
                              defaultValues: editRecord.value,
                              onSuccess: () => {
                                editRecord.value = null;
                              },
                              onError: handleEditError(editId!),
                              submitLabel: "Save changes",
                            })
                          : null,
                      ],
                    },
                  ),
              },
            )
          : null,

        props.actions
          ? h(
              Dialog,
              {
                open: deleteRecord.value !== null,
                onOpenChange: (open: boolean) => {
                  if (!open) {
                    deleteRecord.value = null;
                  }
                },
              },
              {
                default: () =>
                  h(
                    DialogContent,
                    {},
                    {
                      default: () => [
                        h(
                          DialogHeader,
                          {},
                          {
                            default: () => [
                              h(
                                DialogTitle,
                                {},
                                {
                                  default: () =>
                                    `Delete this ${props.resource.name}?`,
                                },
                              ),
                              h(
                                DialogDescription,
                                {},
                                { default: () => "This can't be undone." },
                              ),
                            ],
                          },
                        ),
                        deleteMutation.error.value &&
                        !isPermissionDenied(deleteMutation.error.value)
                          ? h(
                              "p",
                              {
                                role: "alert",
                                class: "text-sm text-destructive",
                              },
                              deleteMutation.error.value.message,
                            )
                          : null,
                        h(
                          DialogFooter,
                          {},
                          {
                            default: () => [
                              h(
                                DialogClose,
                                { asChild: true },
                                {
                                  default: () =>
                                    h(
                                      Button,
                                      { type: "button", variant: "outline" },
                                      { default: () => "Cancel" },
                                    ),
                                },
                              ),
                              h(
                                Button,
                                {
                                  type: "button",
                                  variant: "destructive",
                                  disabled: deleteMutation.isPending.value,
                                  onClick: () =>
                                    deleteMutation.mutate(deleteId!),
                                },
                                {
                                  default: () =>
                                    deleteMutation.isPending.value
                                      ? "Deleting…"
                                      : "Delete",
                                },
                              ),
                            ],
                          },
                        ),
                      ],
                    },
                  ),
              },
            )
          : null,

        props.actions
          ? h(
              Dialog,
              {
                open: bulkDeleteOpen.value,
                onOpenChange: (open: boolean) => {
                  if (!open) {
                    bulkDeleteOpen.value = false;
                  }
                },
              },
              {
                default: () =>
                  h(
                    DialogContent,
                    {},
                    {
                      default: () => [
                        h(
                          DialogHeader,
                          {},
                          {
                            default: () => [
                              h(
                                DialogTitle,
                                {},
                                {
                                  default: () =>
                                    `Delete ${selectedCount} ${props.resource.name}?`,
                                },
                              ),
                              h(
                                DialogDescription,
                                {},
                                { default: () => "This can't be undone." },
                              ),
                            ],
                          },
                        ),
                        bulkDeleteError.value
                          ? h(
                              "p",
                              {
                                role: "alert",
                                class: "text-sm text-destructive",
                              },
                              bulkDeleteError.value,
                            )
                          : null,
                        h(
                          DialogFooter,
                          {},
                          {
                            default: () => [
                              h(
                                DialogClose,
                                { asChild: true },
                                {
                                  default: () =>
                                    h(
                                      Button,
                                      { type: "button", variant: "outline" },
                                      { default: () => "Cancel" },
                                    ),
                                },
                              ),
                              h(
                                Button,
                                {
                                  type: "button",
                                  variant: "destructive",
                                  disabled: bulkDeleting.value,
                                  onClick: () => void confirmBulkDelete(),
                                },
                                {
                                  default: () =>
                                    bulkDeleting.value ? "Deleting…" : "Delete",
                                },
                              ),
                            ],
                          },
                        ),
                      ],
                    },
                  ),
              },
            )
          : null,
      ]);
    };
  },
});
