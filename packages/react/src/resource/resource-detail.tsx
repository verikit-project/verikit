import { useState, type ReactElement, type ReactNode } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
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
import { DeclaredActionButton } from "./declared-action-button.js";
import {
  hasStatus,
  isActionDenied,
  isPermissionDenied,
  ResourceActionDialog,
  useRunResourceAction,
} from "./resource-action-dialog.js";
import { ResourceForm } from "./resource-form.js";

/** Props for {@link ResourceDetail}. */
export interface ResourceDetailProps<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
  /** The resource (or its schema) whose fields and actions the page shows. */
  resource: Resource | ResourceSchema;
  /** Id of the record to show. */
  id: string;
  /**
   * Renders the built-in Edit (opens a `ResourceForm` dialog pre-filled from the record) and Delete (opens a confirmation dialog) actions. One the server denies (403) is hidden for the rest of this component's lifetime.
   */
  actions?: boolean;
  /**
   * Renders the record-scoped actions declared on the resource via `defineResource({ actions })`. The page asks the server which of them the actor can't run on this record: those it may not run are hidden, and those that can't run right now are disabled, with the reason as a tooltip. An action denied when run (403 or 404) is hidden for the rest of this component's lifetime. Defaults to `actions`.
   */
  resourceActions?: boolean;
  /** Renders extra actions alongside the built-in and declared ones. */
  renderActions?: (record: TRecord) => ReactNode;
  /**
   * Called after the record is deleted through the built-in Delete action, e.g. to navigate away. The page shows a "deleted" message until then.
   */
  onDeleted?: (record: TRecord) => void;
  /** Class name applied to the outer container. */
  className?: string;
}

/**
 * Shows one record's fields as a label/value list, with its actions: the built-in Edit and Delete, and the record-scoped actions declared on the resource. Fields marked `.hidden()`, or left out by the server because the actor can't read them, aren't shown. A record the actor can't read shows as not found, as the server doesn't reveal whether it exists.
 */
export function ResourceDetail<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>({
  resource,
  id,
  actions = false,
  resourceActions = actions,
  renderActions,
  onDeleted,
  className,
}: ResourceDetailProps<TRecord>): ReactElement {
  const [deleted, setDeleted] = useState(false);
  const query = useResourceFindWithActions<TRecord>(resource.name, id, {
    enabled: !deleted,
  });
  const fields = resolveVerikitFields(resource);
  const recordActions = resourceActions
    ? resourceActionSchemas(resource, "record")
    : [];

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [denied, setDenied] = useState<{
    update?: boolean;
    delete?: boolean;
    actions: Record<string, true>;
  }>({ actions: {} });
  const [activeAction, setActiveAction] = useState<ActionSchemaLike | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  function denyAction(action: ActionSchemaLike): void {
    setDenied((current) => ({
      ...current,
      actions: { ...current.actions, [action.name]: true },
    }));
  }

  const directAction = useRunResourceAction(resource.name, {
    onSuccess: () => setActionError(null),
    onError: (mutationError, variables) => {
      if (isActionDenied(mutationError, variables.recordId)) {
        denyAction(variables.action);
      } else {
        setActionError(mutationError.message);
      }
    },
  });

  function startAction(action: ActionSchemaLike): void {
    setActionError(null);

    if (actionNeedsDialog(action)) {
      setActiveAction(action);
    } else {
      directAction.mutate({ action, recordId: id });
    }
  }

  const deleteMutation = useDeleteResource(resource.name, {
    onError: (mutationError) => {
      if (isPermissionDenied(mutationError)) {
        setDenied((current) => ({ ...current, delete: true }));
        setDeleteOpen(false);
      }
    },
    onSuccess: () => {
      setDeleteOpen(false);
      setDeleted(true);
      onDeleted?.(query.data!.record);
    },
  });

  if (deleted) {
    return (
      <p
        role="status"
        className={cn("text-sm text-muted-foreground", className)}
      >
        This {resource.name} was deleted.
      </p>
    );
  }

  if (query.isPending) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>Loading…</p>
    );
  }

  if (query.isError) {
    return hasStatus(query.error, 404) ? (
      <p
        role="status"
        className={cn("text-sm text-muted-foreground", className)}
      >
        This {resource.name} doesn&apos;t exist or you can&apos;t view it.
      </p>
    ) : (
      <p role="alert" className={cn("text-sm text-destructive", className)}>
        {query.error.message}
      </p>
    );
  }

  const { record, actions: unavailable } = query.data;
  const visibleFields = Object.values(fields).filter(
    (field) => !field.hidden && Object.hasOwn(record, field.name),
  );
  const hasActions =
    actions || recordActions.length > 0 || Boolean(renderActions);

  return (
    <div className={cn("w-full", className)}>
      {hasActions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 pb-3">
          {recordActions.map((action) =>
            denied.actions[action.name] ? null : (
              <DeclaredActionButton
                key={action.name}
                action={action}
                unavailable={unavailable[action.name]}
                variant={
                  action.variant === "danger" ? "destructive" : "outline"
                }
                disabled={directAction.isPending}
                onClick={() => startAction(action)}
              />
            ),
          )}
          {actions && !denied.update ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <PencilIcon />
              Edit
            </Button>
          ) : null}
          {actions && !denied.delete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                deleteMutation.reset();
                setDeleteOpen(true);
              }}
            >
              <Trash2Icon />
              Delete
            </Button>
          ) : null}
          {renderActions ? renderActions(record) : null}
        </div>
      ) : null}

      {actionError ? (
        <p role="alert" className="pb-3 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(8rem,max-content)_1fr]">
        {visibleFields.map((field) => (
          <div key={field.name} className="contents">
            <dt className="text-sm font-medium text-muted-foreground">
              {field.label ?? field.name}
            </dt>
            <dd className="text-sm wrap-break-word">
              {formatFieldValue(record[field.name])}
            </dd>
          </div>
        ))}
      </dl>

      {recordActions.length > 0 ? (
        <ResourceActionDialog
          resourceName={resource.name}
          action={activeAction}
          recordId={id}
          onClose={() => setActiveAction(null)}
          onDenied={denyAction}
        />
      ) : null}

      {actions ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {resource.name}</DialogTitle>
            </DialogHeader>
            <ResourceForm<TRecord>
              resource={resource}
              id={id}
              defaultValues={record}
              onSuccess={() => setEditOpen(false)}
              onError={(mutationError) => {
                if (isPermissionDenied(mutationError)) {
                  setDenied((current) => ({ ...current, update: true }));
                  setEditOpen(false);
                }
              }}
              submitLabel="Save changes"
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {actions ? (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
                onClick={() => deleteMutation.mutate(id)}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
