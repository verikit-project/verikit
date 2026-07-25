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

export type VerikitFormValues = Record<string, unknown>;
export type VerikitFieldErrors = Record<string, string[]>;
export type VerikitFormFields = Record<string, FieldSchema>;

export interface VerikitValidationFailure {
  success: false;
  reason: "inference" | "validation";
  issues: ValidationIssue[];
  fieldErrors: VerikitFieldErrors;
}

export interface VerikitResourceSubmitSuccess<TResult = unknown> {
  success: true;
  value: VerikitFormValues;
  result: TResult;
  fieldErrors: VerikitFieldErrors;
}

export type VerikitResourceSubmitResult<TResult = unknown> =
  VerikitResourceSubmitSuccess<TResult> | VerikitValidationFailure;

export type VerikitActionSubmitResult<TResult = unknown> =
  | (ActionRunResult<TResult> & { fieldErrors: VerikitFieldErrors })
  | VerikitValidationFailure;

export interface SubmitVerikitResourceFormOptions<TResult = unknown> {
  fields: VerikitFormFields;
  values: VerikitFormValues;
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

export interface SubmitVerikitActionFormOptions<
  TForm extends ActionFormMap = ActionFormMap,
  TContext = unknown,
  TRecord = unknown,
  TResult = unknown,
> {
  action: ActionBuilder<string, TForm, TContext, TRecord, TResult>;
  request: Omit<ActionRunRequest<TContext, TRecord>, "input">;
  values: VerikitFormValues;
}

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

export function firstFieldError(
  fieldErrors: VerikitFieldErrors,
  name: string,
): string | undefined {
  return fieldErrors[name]?.[0];
}

export async function inferAndValidateResource(
  fields: VerikitFormFields,
  values: VerikitFormValues,
): Promise<ValidationResult<VerikitFormValues>> {
  const inferred = inferResource(fields, values);

  if (!inferred.success) {
    return inferred;
  }

  return validateResourceAsync(fields, inferred.value);
}

export async function submitVerikitResourceForm<TResult = undefined>({
  fields,
  values,
  onSubmit,
}: SubmitVerikitResourceFormOptions<TResult>): Promise<
  VerikitResourceSubmitResult<TResult | undefined>
> {
  const inferred = inferResource(fields, values);

  if (!inferred.success) {
    return {
      success: false,
      reason: "inference",
      issues: inferred.issues,
      fieldErrors: validationIssuesToFieldErrors(inferred.issues),
    };
  }

  const validated = await validateResourceAsync(fields, inferred.value);

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
