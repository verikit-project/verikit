import {
  shouldValidateField,
  validateFieldAsync,
  type FieldSchema,
  type SchemaNode,
  type ValidationIssue,
  type ValidationResult,
} from "@verikit/core";
import {
  inferField,
  type ActionBuilder,
  type ActionFormMap,
  type ActionRunRequest,
} from "@verikit/runtime";
import {
  getValueAtPath,
  pathKey,
  setValueAtPath,
  unsetValueAtPath,
  type SchemaPath,
} from "../layout/path.js";
import {
  submitVerikitActionForm,
  type VerikitActionSubmitResult,
  VerikitFieldErrors,
  VerikitFormValues,
  VerikitResourceSubmitResult,
} from "./submission.js";

/**
 * Options for inferring, validating, and submitting schema tree form values.
 */
export interface SubmitVerikitSchemaTreeFormOptions<TResult = unknown> {
  /** Schema nodes that describe the rendered form tree. */
  tree: readonly SchemaNode[];
  /** Raw form values keyed by schema path. */
  values: VerikitFormValues;
  /** Optional callback invoked with inferred and validated values. */
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

/** Options for submitting an action form from schema tree values. */
export interface SubmitVerikitSchemaTreeActionFormOptions<
  TName extends string = string,
  TForm extends ActionFormMap = ActionFormMap,
  TContext = unknown,
  TRecord = unknown,
  TResult = unknown,
> {
  /** Runtime action whose form should infer, validate, and execute. */
  action: ActionBuilder<TName, TForm, TContext, TRecord, TResult>;
  /**
   * Action request without input; inferred tree values are supplied as input.
   */
  request: Omit<ActionRunRequest<TContext, TRecord>, "input">;
  /** Schema tree form values containing the action input at `path`. */
  values: VerikitFormValues;
  /** Path to the action input values. Defaults to the action name. */
  path?: SchemaPath;
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
/**
 * Returns the parent object containing `path` and its sibling values,
 * or `{}` when the parent is missing or not a plain object.
 */
function siblingValues(
  path: SchemaPath,
  values: VerikitFormValues,
): Record<string, unknown> {
  const parent = getValueAtPath(values, path.slice(0, -1));

  return typeof parent === "object" && parent !== null && !Array.isArray(parent)
    ? (parent as Record<string, unknown>)
    : {};
}

function shouldValidateTreeField(
  field: FieldSchema,
  path: SchemaPath,
  values: VerikitFormValues,
): boolean {
  const key = String(path[path.length - 1]);

  return shouldValidateField(key, field, siblingValues(path, values));
}

/**
 * Collects fields eligible for inference and validation and tracks
 * read-only paths so their values can be removed before submission.
 */
function partitionTreeFields(
  tree: readonly SchemaNode[],
  values: VerikitFormValues,
): { entries: TreeFieldEntry[]; readOnlyPaths: SchemaPath[] } {
  const all = collectTreeFields(tree, values, []);

  return {
    entries: all
      .filter((entry) => !entry.field.readOnly)
      .filter((entry) =>
        shouldValidateTreeField(entry.field, entry.path, values),
      ),
    readOnlyPaths: all
      .filter((entry) => entry.field.readOnly)
      .map((entry) => entry.path),
  };
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

/**
 * Writes each entry's value at its path. Callers must have already confirmed every entry succeeded.
 */
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

/**
 * Infers, validates, and submits values for fields nested in a schema tree.
 */
export async function submitVerikitSchemaTreeForm<TResult = undefined>({
  tree,
  values,
  onSubmit,
}: SubmitVerikitSchemaTreeFormOptions<TResult>): Promise<
  VerikitResourceSubmitResult<TResult | undefined>
> {
  const { entries, readOnlyPaths } = partitionTreeFields(tree, values);
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
  // A genuine key removal, not merely clearing to `undefined`: this result's
  // `value` can be spread over other data downstream (e.g. an optimistic
  // cache merge), where a present-but-`undefined` key would wrongly clobber
  // an existing value instead of leaving it untouched.
  const finalValues = readOnlyPaths.reduce<VerikitFormValues>(
    (current, path) => unsetValueAtPath(current, path) as VerikitFormValues,
    validatedValues,
  );

  return {
    success: true,
    value: finalValues,
    result: await onSubmit?.(finalValues),
    fieldErrors: {},
  };
}

/**
 * Infers and validates schema tree values without calling a submit callback.
 */
export async function inferAndValidateSchemaTree(
  tree: readonly SchemaNode[],
  values: VerikitFormValues,
): Promise<ValidationResult<VerikitFormValues>> {
  const result = await submitVerikitSchemaTreeForm({ tree, values });

  return result.success
    ? { success: true, value: result.value }
    : { success: false, issues: result.issues };
}

/**
 * Extracts nested action input values from a schema tree and runs the action.
 */
export async function submitVerikitSchemaTreeActionForm<
  TName extends string = string,
  TForm extends ActionFormMap = ActionFormMap,
  TContext = unknown,
  TRecord = unknown,
  TResult = unknown,
>({
  action,
  request,
  values,
  path = [action.name],
}: SubmitVerikitSchemaTreeActionFormOptions<
  TName,
  TForm,
  TContext,
  TRecord,
  TResult
>): Promise<VerikitActionSubmitResult<TResult>> {
  const actionValues = getValueAtPath(values, path);

  return submitVerikitActionForm({
    action,
    request,
    values:
      typeof actionValues === "object" && actionValues !== null
        ? (actionValues as VerikitFormValues)
        : {},
  });
}
