import {
  validateResourceAsync,
  type FieldSchema,
  type ValidationIssue,
  type ValidationResult,
} from "@verikit/core";
import {
  inferResource,
  runAction,
  type ActionBuilder,
  type ActionFormMap,
  type ActionRunRequest,
  type ActionRunResult,
} from "@verikit/runtime";

/** Plain form values keyed by Verikit field name. */
export type VerikitFormValues = Record<string, unknown>;

/** Validation messages keyed by field name or form-level key. */
export type VerikitFieldErrors = Record<string, string[]>;

/** Verikit field schema map keyed by field name. */
export type VerikitFormFields = Record<string, FieldSchema>;

/** Failed inference or validation result with issues mapped to fields. */
export interface VerikitValidationFailure {
  /** Marks the result as failed. */
  success: false;
  /** Stage that produced the failure. */
  reason: "inference" | "validation";
  /** Validation issues returned by Verikit. */
  issues: ValidationIssue[];
  /** Issues grouped by field key for UI rendering. */
  fieldErrors: VerikitFieldErrors;
}

/** Successful resource form submission result. */
export interface VerikitResourceSubmitSuccess<TResult = unknown> {
  /** Marks the result as successful. */
  success: true;
  /** Inferred and validated values. */
  value: VerikitFormValues;
  /** Value returned by the submit callback. */
  result: TResult;
  /** Empty field error map for successful submissions. */
  fieldErrors: VerikitFieldErrors;
}

/** Result returned when submitting a resource-backed form. */
export type VerikitResourceSubmitResult<TResult = unknown> =
  VerikitResourceSubmitSuccess<TResult> | VerikitValidationFailure;

/** Result returned when submitting an action-backed form. */
export type VerikitActionSubmitResult<TResult = unknown> =
  | (ActionRunResult<TResult> & { fieldErrors: VerikitFieldErrors })
  | VerikitValidationFailure;

/**
 * Options for inferring, validating, and optionally submitting a resource form.
 */
export interface SubmitVerikitResourceFormOptions<TResult = unknown> {
  /** Field schema map used for inference and validation. */
  fields: VerikitFormFields;
  /** Raw form values to submit. */
  values: VerikitFormValues;
  /** Optional callback invoked with inferred and validated values. */
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

/** Options for inferring values and running a Verikit action. */
export interface SubmitVerikitActionFormOptions<
  TForm extends ActionFormMap = ActionFormMap,
  TContext = unknown,
  TRecord = unknown,
  TResult = unknown,
> {
  /** Action whose runtime form and handler should be used. */
  action: ActionBuilder<string, TForm, TContext, TRecord, TResult>;
  /** Action request without input; inferred values are supplied as input. */
  request: Omit<ActionRunRequest<TContext, TRecord>, "input">;
  /** Raw form values to infer before running the action. */
  values: VerikitFormValues;
}

/**
 * Groups validation issues by their first path segment for field rendering.
 */
export function validationIssuesToFieldErrors(
  issues: readonly ValidationIssue[],
): VerikitFieldErrors {
  const errors: VerikitFieldErrors = {};

  for (const issue of issues) {
    const [fieldName] = issue.path;
    const key =
      typeof fieldName === "string" || typeof fieldName === "number"
        ? String(fieldName)
        : "$form";

    errors[key] = [...(errors[key] ?? []), issue.message];
  }

  return errors;
}

/** Returns the first error message for a field, if present. */
export function firstFieldError(
  fieldErrors: VerikitFieldErrors,
  name: string,
): string | undefined {
  return fieldErrors[name]?.[0];
}

/** Collapses each key's error list down to its first message. */
export function firstFieldErrors(
  fieldErrors: VerikitFieldErrors,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]]),
  );
}

/** Returns a copy of `fieldErrors` with `name`'s entry removed. */
export function omitFieldError(
  fieldErrors: VerikitFieldErrors,
  name: string,
): VerikitFieldErrors {
  const { [name]: _removed, ...remaining } = fieldErrors;
  return remaining;
}

/**
 * A field marked `.readOnly()` is always excluded from create/update
 * submissions, regardless of write permissions. See `FieldSchema.readOnly`.
 * A field marked `.formHidden()` never appears in the form UI either, so it
 * can't have a value for the user to submit. See `FieldSchema.formHidden`.
 *
 * Both are filtered out before inference and validation so that a
 * `required()` read-only or form-hidden field (such as a server-computed
 * display value) does not block a submission that will never include that
 * field.
 */
function writableFields(fields: VerikitFormFields): VerikitFormFields {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([, schema]) => !schema.readOnly && !schema.formHidden,
    ),
  );
}

/** Infers raw values and validates the inferred resource values. */
export async function inferAndValidateResource(
  fields: VerikitFormFields,
  values: VerikitFormValues,
): Promise<ValidationResult<VerikitFormValues>> {
  const relevantFields = writableFields(fields);
  const inferred = inferResource(relevantFields, values);

  if (!inferred.success) {
    return inferred;
  }

  return validateResourceAsync(relevantFields, inferred.value);
}

/** Infers, validates, and submits a resource-backed form. */
export async function submitVerikitResourceForm<TResult = undefined>({
  fields,
  values,
  onSubmit,
}: SubmitVerikitResourceFormOptions<TResult>): Promise<
  VerikitResourceSubmitResult<TResult | undefined>
> {
  const relevantFields = writableFields(fields);
  const inferred = inferResource(relevantFields, values);

  if (!inferred.success) {
    return {
      success: false,
      reason: "inference",
      issues: inferred.issues,
      fieldErrors: validationIssuesToFieldErrors(inferred.issues),
    };
  }

  const validated = await validateResourceAsync(relevantFields, inferred.value);

  if (!validated.success) {
    return {
      success: false,
      reason: "validation",
      issues: validated.issues,
      fieldErrors: validationIssuesToFieldErrors(validated.issues),
    };
  }

  return {
    success: true,
    value: validated.value,
    result: await onSubmit?.(validated.value),
    fieldErrors: {},
  };
}

/**
 * Infers action input values and runs the action with mapped field errors.
 */
export async function submitVerikitActionForm<
  TForm extends ActionFormMap = ActionFormMap,
  TContext = unknown,
  TRecord = unknown,
  TResult = unknown,
>({
  action,
  request,
  values,
}: SubmitVerikitActionFormOptions<TForm, TContext, TRecord, TResult>): Promise<
  VerikitActionSubmitResult<TResult>
> {
  const form = action.getRuntime().form;
  const fields = form
    ? Object.fromEntries(
        Object.entries(form).map(([name, field]) => [
          name,
          field.toSchema(name),
        ]),
      )
    : {};
  const inferred = inferResource(fields, values);

  if (!inferred.success) {
    return {
      success: false,
      reason: "inference",
      issues: inferred.issues,
      fieldErrors: validationIssuesToFieldErrors(inferred.issues),
    };
  }

  const result = await runAction(action, {
    ...request,
    input: inferred.value,
  });

  return {
    ...result,
    fieldErrors:
      result.success === false && result.reason === "validation"
        ? validationIssuesToFieldErrors(result.issues)
        : {},
  };
}
