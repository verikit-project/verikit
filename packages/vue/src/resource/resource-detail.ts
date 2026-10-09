import { defineComponent, h, ref, type PropType, type VNodeChild } from "vue";
import { PencilIcon, Trash2Icon } from "lucide-vue-next";
import { Button } from "#components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/dialog";
import { cn } from "#lib/utils";
import type { ActionSchemaLike, Resource, ResourceSchema } from "@verikit/core";
import {
  actionNeedsDialog,
  resourceActionSchemas,
} from "@verikit/ui-core/actions/resource-actions";
import { resolveVerikitFields } from "@verikit/ui-core/form/resolve-fields";
import { formatFieldValue } from "@verikit/ui-core/layout/format-value";
import { useDeleteResource } from "../query/use-resource-mutations.js";
import { useResourceFindWithActions } from "../query/use-resource-queries.js";
import { declaredActionButton } from "./declared-action-button.js";
import {
  hasStatus,
  isActionDenied,
  ResourceActionDialog,
  useRunResourceAction,
} from "./resource-action-dialog.js";
import { ResourceForm } from "./resource-form.js";

type DetailRecord = Record<string, unknown>;

/** Props for {@link ResourceDetail}. */
export interface ResourceDetailProps {
  /** The resource (or its schema) whose fields and actions the page shows. */
  resource: Resource | ResourceSchema;
  /** Id of the record to show. */
  id: string;
  /**
   * Renders the built-in Edit and Delete actions, and the default for `editAction`, `deleteAction`, and `resourceActions`.
   */
  actions?: boolean;
  /**
   * Renders the built-in Edit action, which opens a `ResourceForm` dialog pre-filled from the record. Hidden when the server reports the actor can't update the record, or when an update is denied (403 or 404) for the rest of this component's lifetime. Defaults to `actions`.
   */
  editAction?: boolean;
  /**
   * Renders the built-in Delete action, which opens a confirmation dialog. Hidden when the server reports the actor can't delete the record, or when a delete is denied (403 or 404) for the rest of this component's lifetime. Defaults to `actions`.
   */
  deleteAction?: boolean;
  /**
   * Renders the record-scoped actions declared on the resource via `defineResource({ actions })`. The page asks the server which of them the actor can't run on this record: those it may not run are hidden, and those that can't run right now are disabled, with the reason as a tooltip. An action denied when run (403 or 404) is hidden for the rest of this component's lifetime. Defaults to `actions`.
   */
  resourceActions?: boolean;
  /** Renders extra actions alongside the built-in and declared ones. */
  renderActions?: (record: DetailRecord) => VNodeChild;
  /**
   * Called after the record is deleted through the built-in Delete action, e.g. to navigate away. The page shows a "deleted" message until then.
   */
  onDeleted?: (record: DetailRecord) => void;
  /** Class name applied to the outer container. */
  className?: string;
}

/**
 * Shows one record's fields as a label/value list, with its actions: the built-in Edit and Delete, and the record-scoped actions declared on the resource. Edit and Delete are hidden up front when the server reports the actor can't update or delete the record. Fields marked `.hidden()`, or left out by the server because the actor can't read them, aren't shown. A record the actor can't read shows as not found, as the server doesn't reveal whether it exists.
 */
export const ResourceDetail = defineComponent({
  name: "ResourceDetail",
  props: {
    resource: {
      type: Object as PropType<ResourceDetailProps["resource"]>,
      required: true,
    },
    id: { type: String, required: true },
    actions: { type: Boolean, default: false },
    editAction: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    deleteAction: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    resourceActions: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    renderActions: {
      type: Function as PropType<ResourceDetailProps["renderActions"]>,
      default: undefined,
    },
    onDeleted: {
      type: Function as PropType<ResourceDetailProps["onDeleted"]>,
      default: undefined,
    },
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const deleted = ref(false);
    const query = useResourceFindWithActions<DetailRecord>(
      props.resource.name,
      () => props.id,
      { enabled: () => !deleted.value },
    );
    const fields = resolveVerikitFields(props.resource);
    const recordActions =
      (props.resourceActions ?? props.actions)
        ? resourceActionSchemas(props.resource, "record")
        : [];

    const editOpen = ref(false);
    const deleteOpen = ref(false);
    const deniedUpdate = ref(false);
    const deniedDelete = ref(false);
    const deniedActions = ref<Record<string, true>>({});
    const activeAction = ref<ActionSchemaLike | null>(null);
    const actionError = ref<string | null>(null);

    function denyAction(action: ActionSchemaLike): void {
      deniedActions.value = { ...deniedActions.value, [action.name]: true };
    }

    const directAction = useRunResourceAction(props.resource.name, {
      onSuccess: () => {
        actionError.value = null;
      },
      onError: (mutationError, variables) => {
        if (isActionDenied(mutationError, variables.recordId)) {
          denyAction(variables.action);
        } else {
          actionError.value = mutationError.message;
        }
      },
    });

    function startAction(action: ActionSchemaLike): void {
      actionError.value = null;

      if (actionNeedsDialog(action)) {
        activeAction.value = action;
      } else {
        directAction.mutate({ action, recordId: props.id });
      }
    }

    const deleteMutation = useDeleteResource(props.resource.name, {
      onError: (mutationError: Error) => {
        // The server answers a denied delete with 404 so as not to reveal
        // whether the record exists, the same as a denied record action.
        if (isActionDenied(mutationError, props.id)) {
          deniedDelete.value = true;
          deleteOpen.value = false;
        }
      },
      onSuccess: () => {
        deleteOpen.value = false;
        deleted.value = true;
        props.onDeleted?.(query.data.value!.record);
      },
    });

    function statusMessage(message: string): VNodeChild {
      return h(
        "p",
        {
          role: "status",
          class: cn("text-sm text-muted-foreground", props.className),
        },
        message,
      );
    }

    function actionBar(
      record: DetailRecord,
      showEdit: boolean,
      showDelete: boolean,
    ): VNodeChild {
      const unavailable = query.data.value!.actions;

      return h(
        "div",
        { class: "flex flex-wrap items-center justify-end gap-2 pb-3" },
        [
          ...recordActions.map((action) =>
            deniedActions.value[action.name]
              ? null
              : declaredActionButton({
                  action,
                  unavailable: unavailable[action.name],
                  variant: "outline",
                  disabled: directAction.isPending.value,
                  onClick: () => startAction(action),
                }),
          ),
          showEdit
            ? h(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: () => {
                    editOpen.value = true;
                  },
                },
                { default: () => [h(PencilIcon), "Edit"] },
              )
            : null,
          showDelete
            ? h(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: () => {
                    deleteMutation.reset();
                    deleteOpen.value = true;
                  },
                },
                { default: () => [h(Trash2Icon), "Delete"] },
              )
            : null,
          props.renderActions ? props.renderActions(record) : null,
        ],
      );
    }

    function editDialog(record: DetailRecord): VNodeChild {
      return h(
        Dialog,
        {
          open: editOpen.value,
          onOpenChange: (open: boolean) => {
            editOpen.value = open;
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
                          { default: () => `Edit ${props.resource.name}` },
                        ),
                    },
                  ),
                  h(ResourceForm, {
                    resource: props.resource,
                    id: props.id,
                    defaultValues: record,
                    onSuccess: () => {
                      editOpen.value = false;
                    },
                    onError: (mutationError: Error) => {
                      if (isActionDenied(mutationError, props.id)) {
                        deniedUpdate.value = true;
                        editOpen.value = false;
                      }
                    },
                    submitLabel: "Save changes",
                  }),
                ],
              },
            ),
        },
      );
    }

    function deleteDialog(): VNodeChild {
      return h(
        Dialog,
        {
          open: deleteOpen.value,
          onOpenChange: (open: boolean) => {
            deleteOpen.value = open;
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
                  !isActionDenied(deleteMutation.error.value, props.id)
                    ? h(
                        "p",
                        { role: "alert", class: "text-sm text-destructive" },
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
                            onClick: () => deleteMutation.mutate(props.id),
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
      );
    }

    return () => {
      if (deleted.value) {
        return statusMessage(`This ${props.resource.name} was deleted.`);
      }

      if (query.isPending.value) {
        return h(
          "p",
          { class: cn("text-sm text-muted-foreground", props.className) },
          "Loading…",
        );
      }

      if (query.isError.value) {
        const error = query.error.value!;
        return hasStatus(error, 404)
          ? statusMessage(
              `This ${props.resource.name} doesn't exist or you can't view it.`,
            )
          : h(
              "p",
              {
                role: "alert",
                class: cn("text-sm text-destructive", props.className),
              },
              error.message,
            );
      }

      const { record, operations } = query.data.value!;
      const editEnabled = props.editAction ?? props.actions;
      const deleteEnabled = props.deleteAction ?? props.actions;
      const showEdit = editEnabled && !deniedUpdate.value && !operations.update;
      const showDelete =
        deleteEnabled && !deniedDelete.value && !operations.delete;
      const visibleFields = Object.values(fields).filter(
        (field) => !field.hidden && Object.hasOwn(record, field.name),
      );
      const hasActions =
        showEdit ||
        showDelete ||
        recordActions.length > 0 ||
        Boolean(props.renderActions);

      return h("div", { class: cn("w-full", props.className) }, [
        hasActions ? actionBar(record, showEdit, showDelete) : null,
        actionError.value
          ? h(
              "p",
              { role: "alert", class: "pb-3 text-sm text-destructive" },
              actionError.value,
            )
          : null,
        h(
          "dl",
          {
            class:
              "grid gap-x-6 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(8rem,max-content)_1fr]",
          },
          visibleFields.map((field) =>
            h("div", { key: field.name, class: "contents" }, [
              h(
                "dt",
                { class: "text-sm font-medium text-muted-foreground" },
                field.label ?? field.name,
              ),
              h(
                "dd",
                { class: "text-sm break-words" },
                formatFieldValue(record[field.name]),
              ),
            ]),
          ),
        ),
        recordActions.length > 0
          ? h(ResourceActionDialog, {
              resourceName: props.resource.name,
              action: activeAction.value,
              recordId: props.id,
              onClose: () => {
                activeAction.value = null;
              },
              onDenied: denyAction,
            })
          : null,
        editEnabled ? editDialog(record) : null,
        deleteEnabled ? deleteDialog() : null,
      ]);
    };
  },
});
