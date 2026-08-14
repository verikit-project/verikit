import type { RelationshipNode } from "@verikit/core";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { Button } from "#components/button";
import { cn } from "#lib/utils";
import type { VerikitFieldRegistry } from "../fields/types.js";
import { RenderSchemaTree } from "../layout/render-schema-node.js";
import type { SchemaPath } from "../layout/path.js";
import {
  useResourceSchemaTreeForm,
  type UseResourceSchemaTreeFormOptions,
} from "../query/use-resource-schema-tree-form.js";
import type { VerikitSchemaTreeSource } from "../form/use-verikit-schema-tree-form.js";

/** Props for {@link ResourceForm}. */
export interface ResourceFormProps<
  TRecord = Record<string, unknown>,
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
}

/**
 * Renders a responsive resource form powered by `useResourceSchemaTreeForm`,
 * with layouts, relationships, conditional fields, and submission state.
 */
export function ResourceForm<TRecord = Record<string, unknown>>({
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
}: ResourceFormProps<TRecord>): ReactElement {
  const result = useResourceSchemaTreeForm<TRecord>(resource, {
    id,
    actions,
    defaultValues,
    onSuccess,
    onError,
  });

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
      />
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
