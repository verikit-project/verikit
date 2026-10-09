import type { UseMutationReturnType } from "@tanstack/vue-query";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { ActionSchemaLike } from "@verikit/core";
import { VerikitClientError, type ActionResult } from "@verikit/client";
import { defineComponent, h, type PropType } from "vue";
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
import { RenderField } from "../fields/registry.js";
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
): UseMutationReturnType<
  ActionResult<unknown>,
  Error,
  RunResourceActionVariables,
  unknown
> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(resourceName, client);

  return useMutation({
    mutationFn: ({ action, recordId, input }: RunResourceActionVariables) =>
      client.resource(resourceName).action(action.name, input, {
        recordId,
        confirmed: action.confirmation ? true : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      options.onSuccess?.();
    },
    onError: (error: Error, variables: RunResourceActionVariables) => {
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

const ActionDialogBody = defineComponent({
  name: "ResourceActionDialogBody",
  props: {
    resourceName: { type: String, required: true },
    action: {
      type: Object as PropType<ActionSchemaLike>,
      required: true,
    },
    recordId: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onDenied: {
      type: Function as PropType<ResourceActionDialogProps["onDenied"]>,
      default: undefined,
    },
    registry: {
      type: Object as PropType<Partial<VerikitFieldRegistry> | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const action = props.action;
    const fields = action.form ?? {};
    const run = useRunResourceAction(props.resourceName, {
      onSuccess: () => props.onClose(),
      onError: (error) => {
        if (isActionDenied(error, props.recordId)) {
          props.onDenied?.(action);
          props.onClose();
        } else if (error instanceof VerikitClientError && error.issues) {
          form.setFieldErrors(validationIssuesToFieldErrors(error.issues));
        }
      },
    });
    const form = useVerikitForm({
      fields,
      onSubmit: (input) =>
        run.mutateAsync({ action, recordId: props.recordId, input }),
    });
    const description = action.confirmation?.message ?? action.description;

    function handleSubmit(event: Event): void {
      event.preventDefault();
      event.stopPropagation();
      // `run.error` already surfaces mutation failures; suppress the rejection here.
      form.submit().catch(() => {});
    }

    return () => [
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
                  action.confirmation?.title ?? actionLabel(action),
              },
            ),
            description
              ? h(DialogDescription, {}, { default: () => description })
              : null,
          ],
        },
      ),
      h(
        "form",
        { class: "grid gap-4", onSubmit: handleSubmit, novalidate: true },
        [
          ...Object.keys(fields).map((name) =>
            RenderField({
              registry: props.registry,
              ...form.getFieldProps(name),
            }),
          ),
          run.error.value && !isActionDenied(run.error.value, props.recordId)
            ? h(
                "p",
                { role: "alert", class: "text-sm text-destructive" },
                run.error.value.message,
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
                        {
                          default: () =>
                            action.confirmation?.cancelLabel ?? "Cancel",
                        },
                      ),
                  },
                ),
                h(
                  Button,
                  {
                    type: "submit",
                    variant:
                      action.variant === "danger" ? "destructive" : "default",
                    disabled: run.isPending.value,
                  },
                  {
                    default: () =>
                      run.isPending.value
                        ? "Running…"
                        : (action.confirmation?.confirmLabel ??
                          actionLabel(action)),
                  },
                ),
              ],
            },
          ),
        ],
      ),
    ];
  },
});

/**
 * Confirms and collects input for a declared resource action, then runs it over `@verikit/client`. Labels, confirmation copy, and form fields all come from the action's declaration in `defineResource({ actions })`.
 */
export const ResourceActionDialog = defineComponent({
  name: "ResourceActionDialog",
  props: {
    resourceName: { type: String, required: true },
    action: {
      type: Object as PropType<ActionSchemaLike | null>,
      default: null,
    },
    recordId: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onDenied: {
      type: Function as PropType<ResourceActionDialogProps["onDenied"]>,
      default: undefined,
    },
    registry: {
      type: Object as PropType<Partial<VerikitFieldRegistry> | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    return () =>
      h(
        Dialog,
        {
          open: props.action !== null,
          onOpenChange: (open: boolean) => {
            if (!open) {
              props.onClose();
            }
          },
        },
        {
          default: () =>
            h(
              DialogContent,
              {},
              {
                default: () =>
                  props.action
                    ? h(ActionDialogBody, {
                        key: `${props.action.name}:${props.recordId ?? ""}`,
                        resourceName: props.resourceName,
                        action: props.action,
                        recordId: props.recordId,
                        onClose: props.onClose,
                        onDenied: props.onDenied,
                        registry: props.registry,
                      })
                    : null,
              },
            ),
        },
      );
  },
});
