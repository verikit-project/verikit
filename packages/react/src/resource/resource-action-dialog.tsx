import type { FormEvent, ReactElement } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActionSchemaLike } from "@verikit/core";
import { VerikitClientError, type ActionResult } from "@verikit/client";
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
import { actionLabel } from "@verikit/ui-core/actions/resource-actions";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";
import { validationIssuesToFieldErrors } from "@verikit/ui-core/form/submission";
import { useVerikitClient } from "../client/use-verikit-client.js";
import { RenderField } from "../fields/index.js";
import type { VerikitFieldRegistry } from "../fields/types.js";
import { useVerikitForm } from "../form/use-verikit-form.js";

function hasStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === status
  );
}

/** True for an error whose `status` is 403, duck-typed like `ResourceTable`. */
export function isPermissionDenied(error: unknown): boolean {
  return hasStatus(error, 403);
}

function isActionUnavailable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ACTION_UNAVAILABLE"
  );
}

/**
 * True when the server denied running an action. The server denies record actions with 404 rather than 403 so it never reveals whether the record exists; the caller already holds that record, so a 404 there means the action can't run on it (denied, or the record is gone).
 */
export function isActionDenied(
  error: unknown,
  recordId: string | undefined,
): boolean {
  return (
    isPermissionDenied(error) ||
    (recordId !== undefined && hasStatus(error, 404))
  );
}

/** Variables for {@link useRunResourceAction}. */
export interface RunResourceActionVariables {
  action: ActionSchemaLike;
  recordId?: string;
  input?: Record<string, unknown>;
}

/**
 * Runs any declared action of a resource over `@verikit/client`, invalidating the resource's queries on success, or when the server reports the action unavailable. Sends `confirmed: true` for actions that declare a confirmation, since callers only run those after the user accepted it.
 */
export function useRunResourceAction(
  resourceName: string,
  options: {
    onSuccess?: () => void;
    onError?: (error: Error, variables: RunResourceActionVariables) => void;
  } = {},
): UseMutationResult<ActionResult<unknown>, Error, RunResourceActionVariables> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(resourceName, client);

  return useMutation({
    mutationFn: ({ action, recordId, input }) =>
      client.resource(resourceName).action(action.name, input, {
        recordId,
        confirmed: action.confirmation ? true : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      options.onSuccess?.();
    },
    onError: (error, variables) => {
      // The list's action availability is stale: refetch it so the action
      // shows as unavailable.
      if (isActionUnavailable(error)) {
        void queryClient.invalidateQueries({ queryKey: keys.all });
      }
      options.onError?.(error, variables);
    },
  });
}

/** Props for {@link ResourceActionDialog}. */
export interface ResourceActionDialogProps {
  /** Resource the action belongs to. */
  resourceName: string;
  /** Declared action to run; the dialog is open while this is set. */
  action: ActionSchemaLike | null;
  /** Record the action targets, for record-scoped actions. */
  recordId?: string;
  /** Called when the dialog closes, after success or cancel. */
  onClose: () => void;
  /** Called when the server denies the action (403, or 404 for a record action); the dialog then closes. */
  onDenied?: (action: ActionSchemaLike) => void;
  /** Optional renderer overrides for the action's form fields. */
  registry?: Partial<VerikitFieldRegistry>;
}

function ActionDialogBody({
  resourceName,
  action,
  recordId,
  onClose,
  onDenied,
  registry,
}: ResourceActionDialogProps & { action: ActionSchemaLike }): ReactElement {
  const fields = action.form ?? {};
  const run = useRunResourceAction(resourceName, {
    onSuccess: onClose,
    onError: (error) => {
      if (isActionDenied(error, recordId)) {
        onDenied?.(action);
        onClose();
      } else if (error instanceof VerikitClientError && error.issues) {
        form.setFieldErrors(validationIssuesToFieldErrors(error.issues));
      }
    },
  });
  const form = useVerikitForm({
    fields,
    onSubmit: (input) => run.mutateAsync({ action, recordId, input }),
  });
  const description = action.confirmation?.message ?? action.description;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // `run.error` already surfaces mutation failures; suppress the rejection here.
    form.submit().catch(() => {});
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {action.confirmation?.title ?? actionLabel(action)}
        </DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        {Object.keys(fields).map((name) => (
          <RenderField
            key={name}
            registry={registry}
            {...form.getFieldProps(name)}
          />
        ))}
        {run.error && !isActionDenied(run.error, recordId) ? (
          <p role="alert" className="text-sm text-destructive">
            {run.error.message}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline">
                {action.confirmation?.cancelLabel ?? "Cancel"}
              </Button>
            }
          />
          <Button
            type="submit"
            variant={action.variant === "danger" ? "destructive" : "default"}
            disabled={run.isPending}
          >
            {run.isPending
              ? "Running…"
              : (action.confirmation?.confirmLabel ?? actionLabel(action))}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * Confirms and collects input for a declared resource action, then runs it over `@verikit/client`. Labels, confirmation copy, and form fields all come from the action's declaration in `defineResource({ actions })`.
 */
export function ResourceActionDialog(
  props: ResourceActionDialogProps,
): ReactElement {
  const { action, onClose } = props;

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        {action ? (
          <ActionDialogBody
            key={`${action.name}:${props.recordId ?? ""}`}
            {...props}
            action={action}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
