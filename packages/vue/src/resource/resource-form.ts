import type { ActionSchemaLike, RelationshipNode } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { isResource } from "@verikit/ui-core/form/resolve-fields";
import { getValueAtPath, type SchemaPath } from "@verikit/ui-core/layout/path";
import { defineComponent, h, ref, type PropType, type VNodeChild } from "vue";
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
import {
  useRunResourceAction,
  type RunResourceActionVariables,
} from "./resource-action-dialog.js";
import type { VerikitFieldRegistry } from "../fields/types.js";
import { RenderSchemaTree } from "../layout/render-schema-node.js";
import {
  useResourceSchemaTreeForm,
  type UseResourceSchemaTreeFormOptions,
} from "../query/use-resource-schema-tree-form.js";
import type { VerikitSchemaTreeSource } from "../form/use-verikit-schema-tree-form.js";

/** Props for {@link ResourceForm}. */
export interface ResourceFormProps<
  TRecord extends object = Record<string, unknown>,
> extends UseResourceSchemaTreeFormOptions<TRecord> {
  /** The resource (or its schema) whose tree drives the form and submission. */
  resource: VerikitSchemaTreeSource;
  /** Optional renderer overrides keyed by field type. */
  registry?: Partial<VerikitFieldRegistry>;
  /**
   * Overrides relationship rendering. By default, `belongsTo` uses the
   * built-in picker; collection relationships require a custom renderer.
   */
  renderRelationship?: (node: RelationshipNode, path: SchemaPath) => VNodeChild;
  /** Label shown on the submit button while idle. Defaults to `"Save"`. */
  submitLabel?: string;
  /** Class name applied to the outer `<form>`. */
  className?: string;
  /**
   * Replaces what an action node's button does. By default it runs the
   * resource's declared action of that name on the server, with the values of
   * the action's inline form as input and this form's `id` as the record
   * (for record-scoped actions), asking first when the action declares a
   * confirmation.
   */
  onAction?: (name: string, path: SchemaPath) => void;
}

/** What an action button reported last, shown under the form's fields. */
type ActionFeedback = { kind: "success" | "error"; text: string };

function declaredActions(
  resource: VerikitSchemaTreeSource,
): Record<string, ActionSchemaLike> {
  return (
    (isResource(resource) ? resource.toSchema().actions : resource.actions) ??
    {}
  );
}

function actionErrorText(error: Error): string {
  const issues =
    error instanceof VerikitClientError ? (error.issues ?? []) : [];

  return [error.message, ...issues.map((issue) => issue.message)].join(" ");
}

/**
 * Renders a responsive resource form powered by `useResourceSchemaTreeForm`,
 * with layouts, relationships, conditional fields, and submission state.
 */
export const ResourceForm = defineComponent({
  name: "ResourceForm",
  props: {
    resource: {
      type: Object as PropType<VerikitSchemaTreeSource>,
      required: true,
    },
    id: { type: String as PropType<string | undefined>, default: undefined },
    actions: {
      type: Object as PropType<ResourceFormProps["actions"]>,
      default: undefined,
    },
    defaultValues: {
      type: Object as PropType<ResourceFormProps["defaultValues"]>,
      default: undefined,
    },
    onSuccess: {
      type: Function as PropType<ResourceFormProps["onSuccess"]>,
      default: undefined,
    },
    onError: {
      type: Function as PropType<ResourceFormProps["onError"]>,
      default: undefined,
    },
    registry: {
      type: Object as PropType<Partial<VerikitFieldRegistry> | undefined>,
      default: undefined,
    },
    renderRelationship: {
      type: Function as PropType<ResourceFormProps["renderRelationship"]>,
      default: undefined,
    },
    submitLabel: { type: String, default: "Save" },
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    // A prop rather than an emit, so the form knows whether to run actions
    // itself; `@action` still binds here.
    onAction: {
      type: Function as PropType<ResourceFormProps["onAction"]>,
      default: undefined,
    },
  },
  setup(props) {
    const result = useResourceSchemaTreeForm(props.resource, {
      id: props.id,
      actions: props.actions,
      defaultValues: props.defaultValues,
      onSuccess: props.onSuccess,
      onError: props.onError,
    });

    const confirming = ref<RunResourceActionVariables | null>(null);
    const feedback = ref<ActionFeedback | null>(null);
    const runAction = useRunResourceAction(props.resource.name);

    function run(variables: RunResourceActionVariables): void {
      confirming.value = null;
      feedback.value = null;
      runAction.mutate(variables, {
        onSuccess: (response) => {
          feedback.value = {
            kind: "success",
            text:
              response.message ??
              variables.action.result?.successMessage ??
              `${variables.action.label ?? variables.action.name} done.`,
          };
        },
        onError: (error) => {
          feedback.value = { kind: "error", text: actionErrorText(error) };
        },
      });
    }

    function handleAction(name: string, path: SchemaPath): void {
      const action = declaredActions(props.resource)[name];

      if (!action) {
        feedback.value = {
          kind: "error",
          text: `"${name}" isn't an action declared on ${props.resource.name}.`,
        };
        return;
      }

      const input = getValueAtPath(result.treeProps.value.values, path);
      const variables: RunResourceActionVariables = {
        action,
        recordId: action.scope === "collection" ? undefined : props.id,
        input:
          typeof input === "object" && input !== null
            ? (input as Record<string, unknown>)
            : undefined,
      };

      if (action.confirmation) {
        confirming.value = variables;
      } else {
        run(variables);
      }
    }

    function confirmationDialog(): VNodeChild {
      const pending = confirming.value;
      const confirmation = pending?.action.confirmation;

      return h(
        Dialog,
        {
          open: pending !== null,
          onOpenChange: (open: boolean) => {
            if (!open) confirming.value = null;
          },
        },
        {
          default: () =>
            h(
              DialogContent,
              {},
              {
                default: () =>
                  pending && confirmation
                    ? [
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
                                    confirmation.title ??
                                    pending.action.label ??
                                    pending.action.name,
                                },
                              ),
                              h(
                                DialogDescription,
                                {},
                                { default: () => confirmation.message },
                              ),
                            ],
                          },
                        ),
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
                                          confirmation.cancelLabel ?? "Cancel",
                                      },
                                    ),
                                },
                              ),
                              h(
                                Button,
                                { type: "button", onClick: () => run(pending) },
                                {
                                  default: () =>
                                    confirmation.confirmLabel ?? "Confirm",
                                },
                              ),
                            ],
                          },
                        ),
                      ]
                    : null,
              },
            ),
        },
      );
    }

    function handleSubmit(event: Event): void {
      event.preventDefault();
      event.stopPropagation();
      // `submitError` already handles mutation failures; suppress the rejection here.
      result.submit().catch(() => {});
    }

    return () =>
      h(
        "form",
        {
          class: cn("grid gap-4", props.className),
          onSubmit: handleSubmit,
          novalidate: true,
        },
        [
          RenderSchemaTree({
            nodes: result.tree,
            registry: props.registry,
            renderRelationship: props.renderRelationship,
            ...result.treeProps.value,
            onAction: props.onAction ?? handleAction,
          }),
          feedback.value
            ? h(
                "p",
                {
                  role: feedback.value.kind === "error" ? "alert" : "status",
                  class: cn(
                    "text-sm",
                    feedback.value.kind === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  ),
                },
                feedback.value.text,
              )
            : null,
          confirmationDialog(),
          result.submitError.value
            ? h(
                "p",
                { role: "alert", class: "text-sm text-destructive" },
                result.submitError.value.message,
              )
            : null,
          h("div", { class: "flex justify-end" }, [
            h(
              Button,
              { type: "submit", disabled: result.isSubmitting.value },
              {
                default: () =>
                  result.isSubmitting.value ? "Saving…" : props.submitLabel,
              },
            ),
          ]),
        ],
      );
  },
});
