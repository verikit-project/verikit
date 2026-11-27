import type { ActionSchemaLike, RelationshipNode } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import {
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
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
import { isResource } from "@verikit/ui-core/form/resolve-fields";
import { getValueAtPath } from "@verikit/ui-core/layout/path";
import {
  useRunResourceAction,
  type RunResourceActionVariables,
} from "./resource-action-dialog.js";
import type { VerikitFieldRegistry } from "../fields/types.js";
import { RenderSchemaTree } from "../layout/render-schema-node.js";
import type { SchemaPath } from "@verikit/ui-core/layout/path";
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
  renderRelationship?: (node: RelationshipNode, path: SchemaPath) => ReactNode;
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
export function ResourceForm<TRecord extends object = Record<string, unknown>>({
  resource,
  id,
  actions,
  defaultValues,
  onSuccess,
  onError,
  registry,
  renderRelationship,
  submitLabel = "Save",
  className,
  onAction,
}: ResourceFormProps<TRecord>): ReactElement {
  const result = useResourceSchemaTreeForm<TRecord>(resource, {
    id,
    actions,
    defaultValues,
    onSuccess,
    onError,
  });
  const [confirming, setConfirming] =
    useState<RunResourceActionVariables | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const runAction = useRunResourceAction(resource.name);

  function run(variables: RunResourceActionVariables): void {
    setConfirming(null);
    setFeedback(null);
    runAction.mutate(variables, {
      onSuccess: (response) =>
        setFeedback({
          kind: "success",
          text:
            response.message ??
            variables.action.result?.successMessage ??
            `${variables.action.label ?? variables.action.name} done.`,
        }),
      onError: (error) =>
        setFeedback({ kind: "error", text: actionErrorText(error) }),
    });
  }

  function handleAction(name: string, path: SchemaPath): void {
    const action = declaredActions(resource)[name];

    if (!action) {
      setFeedback({
        kind: "error",
        text: `"${name}" isn't an action declared on ${resource.name}.`,
      });
      return;
    }

    const input = getValueAtPath(result.treeProps.values, path);
    const variables: RunResourceActionVariables = {
      action,
      recordId: action.scope === "collection" ? undefined : id,
      input:
        typeof input === "object" && input !== null
          ? (input as Record<string, unknown>)
          : undefined,
    };

    if (action.confirmation) {
      setConfirming(variables);
    } else {
      run(variables);
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // `submitError` already handles mutation failures; suppress the rejection here.
    result.submit().catch(() => {});
  };

  return (
    <form
      className={cn("grid gap-4", className)}
      onSubmit={handleSubmit}
      noValidate
    >
      <RenderSchemaTree
        nodes={result.tree}
        registry={registry}
        renderRelationship={renderRelationship}
        {...result.treeProps}
        onAction={onAction ?? handleAction}
      />
      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={cn(
            "text-sm",
            feedback.kind === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {feedback.text}
        </p>
      ) : null}
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <DialogContent>
          {confirming ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {confirming.action.confirmation!.title ??
                    confirming.action.label ??
                    confirming.action.name}
                </DialogTitle>
                <DialogDescription>
                  {confirming.action.confirmation!.message}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button type="button" variant="outline">
                      {confirming.action.confirmation!.cancelLabel ?? "Cancel"}
                    </Button>
                  }
                />
                <Button type="button" onClick={() => run(confirming)}>
                  {confirming.action.confirmation!.confirmLabel ?? "Confirm"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      {result.submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {result.submitError.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={result.isSubmitting}>
          {result.isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
