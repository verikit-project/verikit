import {
  shouldValidateField,
  validateFieldAsync,
  type FieldSchema,
  type SchemaNode,
  type ValidationIssue,
  type ValidationResult,
} from "@verikit/core";
import { inferField } from "@verikit/runtime";
import {
  getValueAtPath,
  pathKey,
  setValueAtPath,
  type SchemaPath,
} from "../layout/path.js";
import type {
  VerikitFieldErrors,
  VerikitFormValues,
  VerikitResourceSubmitResult,
} from "./submission.js";

export interface SubmitVerikitSchemaTreeFormOptions<TResult = unknown> {
  tree: readonly SchemaNode[];
  values: VerikitFormValues;
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

interface TreeFieldEntry {
  path: SchemaPath;
  field: FieldSchema;
}

interface TreeFieldResult {
  path: SchemaPath;
  result: ValidationResult;
}

function collectTreeFields(
  nodes: readonly SchemaNode[],
  values: VerikitFormValues,
  path: SchemaPath,
): TreeFieldEntry[] {
  return nodes.flatMap((node): TreeFieldEntry[] => {
    switch (node.type) {
      case "field":
        return [{ path: [...path, node.name], field: node }];
      case "relationship":
      case "action":
        return [];
      case "section":
      case "grid":
        return collectTreeFields(node.children, values, path);
      case "tabs":
        return node.tabs.flatMap((tab) =>
          collectTreeFields(tab.children, values, path),
        );
      case "wizard":
        return node.steps.flatMap((step) =>
          collectTreeFields(step.children, values, path),
        );
      case "repeater": {
        const repeaterPath = [...path, node.name];
        const items = getValueAtPath(values, repeaterPath);
        const rows = Array.isArray(items) ? items : [];

        return rows.flatMap((_, index) =>
          collectTreeFields(node.children, values, [...repeaterPath, index]),
        );
      }
    }
  });
}

function shouldValidateTreeField(
  field: FieldSchema,
  path: SchemaPath,
  values: VerikitFormValues,
): boolean {
  const key = String(path[path.length - 1]);

  return shouldValidateField(key, field, {
    [key]: getValueAtPath(values, path),
  });
}

function relevantTreeFields(
  tree: readonly SchemaNode[],
  values: VerikitFormValues,
): TreeFieldEntry[] {
  return collectTreeFields(tree, values, []).filter((entry) =>
    shouldValidateTreeField(entry.field, entry.path, values),
  );
}

function treeFieldErrors(
  entries: readonly TreeFieldResult[],
): VerikitFieldErrors {
  const errors: VerikitFieldErrors = {};

  for (const { path, result } of entries) {
    if (result.success) {
      continue;
    }

    const key = pathKey(path);
    errors[key] = [
      ...(errors[key] ?? []),
      ...result.issues.map((issue) => issue.message),
    ];
  }

  return errors;
}

function treeFieldIssues(
  entries: readonly TreeFieldResult[],
): ValidationIssue[] {
  return entries.flatMap(({ path, result }) =>
    result.success
      ? []
      : result.issues.map((issue) => ({
          path: [...path, ...issue.path],
          message: issue.message,
        })),
  );
}

/** Writes each entry's value at its path. Callers must have already confirmed every entry succeeded. */
function applySuccessfulResults(
  base: VerikitFormValues,
  entries: readonly TreeFieldResult[],
): VerikitFormValues {
  return entries.reduce<VerikitFormValues>(
    (values, { path, result }) =>
      setValueAtPath(
        values,
        path,
        (result as { success: true; value: unknown }).value,
      ) as VerikitFormValues,
    base,
  );
}

export async function submitVerikitSchemaTreeForm<TResult = undefined>({
  tree,
  values,
  onSubmit,
}: SubmitVerikitSchemaTreeFormOptions<TResult>): Promise<
  VerikitResourceSubmitResult<TResult | undefined>
> {
  const entries = relevantTreeFields(tree, values);
  const inferred = entries.map(({ path, field }) => ({
    path,
    field,
    result: inferField(field, getValueAtPath(values, path)),
  }));

  if (inferred.some(({ result }) => !result.success)) {
    return {
      success: false,
      reason: "inference",
      issues: treeFieldIssues(inferred),
      fieldErrors: treeFieldErrors(inferred),
    };
  }

  const inferredValues = applySuccessfulResults(values, inferred);
  const validated = await Promise.all(
    inferred.map(async ({ path, field, result }) => ({
      path,
      result: await validateFieldAsync(
        field,
        (result as { success: true; value: unknown }).value,
      ),
    })),
  );

  if (validated.some(({ result }) => !result.success)) {
    return {
      success: false,
      reason: "validation",
      issues: treeFieldIssues(validated),
      fieldErrors: treeFieldErrors(validated),
    };
  }

  const validatedValues = applySuccessfulResults(inferredValues, validated);

  return {
    success: true,
    value: validatedValues,
    result: await onSubmit?.(validatedValues),
    fieldErrors: {},
  };
}

export async function inferAndValidateSchemaTree(
  tree: readonly SchemaNode[],
  values: VerikitFormValues,
): Promise<ValidationResult<VerikitFormValues>> {
  const result = await submitVerikitSchemaTreeForm({ tree, values });

  return result.success
    ? { success: true, value: result.value }
    : { success: false, issues: result.issues };
}
