import { useCallback, useMemo, useState } from "react";
import { useForm, type AnyFormApi } from "@tanstack/react-form";
import type { FieldSchema, Resource, ResourceSchema } from "@verikit/core";
import type { VerikitFieldComponentProps } from "../fields/index.js";
import {
  firstFieldError,
  submitVerikitResourceForm,
  type VerikitFieldErrors,
  type VerikitFormFields,
  type VerikitFormValues,
  type VerikitResourceSubmitResult,
} from "./submission.js";

/** Source accepted by the flat Verikit form hook. */
export type VerikitFormSource = VerikitFormFields | Resource | ResourceSchema;

/** Options for creating a flat Verikit form hook instance. */
export interface UseVerikitFormOptions<TResult = unknown> {
  /** Fields, resource builder, or resource schema backing the form. */
  fields: VerikitFormSource;
  /** Initial values passed to TanStack Form. */
  defaultValues?: VerikitFormValues;
  /** Callback invoked after successful inference and validation. */
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

/** State and helpers returned by {@link useVerikitForm}. */
export interface UseVerikitFormResult<TResult = unknown> {
  /** Underlying TanStack Form API instance. */
  form: AnyFormApi;
  /** Resolved field schema map. */
  fields: VerikitFormFields;
  /** Current field error messages. */
  fieldErrors: VerikitFieldErrors;
  /** Replaces the current field error map. */
  setFieldErrors: (errors: VerikitFieldErrors) => void;
  /** Clears all field errors. */
  clearFieldErrors: () => void;
  /** Infers and validates values without calling the submit callback. */
  validate: (
    values?: VerikitFormValues,
  ) => Promise<VerikitResourceSubmitResult<undefined>>;
  /** Infers, validates, and submits values. */
  submit: (
    values?: VerikitFormValues,
  ) => Promise<VerikitResourceSubmitResult<TResult | undefined>>;
  /** Returns the first error message for a field name. */
  getFieldError: (name: string) => string | undefined;
  /** Builds props for rendering a field with the registry components. */
  getFieldProps: (name: string) => VerikitFieldComponentProps;
}

/** Returns true when a source is a resource builder. */
export function isResource(value: VerikitFormSource): value is Resource {
  return typeof (value as Resource).toSchema === "function";
}

function isResourceSchema(value: VerikitFormSource): value is ResourceSchema {
  return (value as ResourceSchema).type === "resource";
}

/** Resolves any supported form source into a field schema map. */
export function resolveVerikitFields(
  source: VerikitFormSource,
): VerikitFormFields {
  if (isResource(source)) {
    return source.toSchema().fields;
  }

  if (isResourceSchema(source)) {
    return source.fields as VerikitFormFields;
  }

  return source;
}

/** Creates a TanStack-backed form for a flat Verikit resource schema. */
export function useVerikitForm<TResult = unknown>({
  fields: fieldSource,
  defaultValues = {},
  onSubmit,
}: UseVerikitFormOptions<TResult>): UseVerikitFormResult<TResult> {
  const fields = useMemo(
    () => resolveVerikitFields(fieldSource),
    [fieldSource],
  );
  const [fieldErrors, setFieldErrors] = useState<VerikitFieldErrors>({});
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await submit(value);
    },
  }) as AnyFormApi;

  const submit = useCallback(
    async (
      values: VerikitFormValues = form.state.values,
    ): Promise<VerikitResourceSubmitResult<TResult | undefined>> => {
      const result = await submitVerikitResourceForm({
        fields,
        values,
        onSubmit,
      });

      setFieldErrors(result.fieldErrors);

      return result;
    },
    [fields, form, onSubmit],
  );

  const validate = useCallback(
    async (
      values: VerikitFormValues = form.state.values,
    ): Promise<VerikitResourceSubmitResult<undefined>> => {
      const result = await submitVerikitResourceForm({
        fields,
        values,
      });

      setFieldErrors(result.fieldErrors);

      return result;
    },
    [fields, form],
  );

  const getFieldError = useCallback(
    (name: string) => firstFieldError(fieldErrors, name),
    [fieldErrors],
  );

  const getFieldProps = useCallback(
    (name: string): VerikitFieldComponentProps => {
      const field = fields[name] as FieldSchema | undefined;

      if (!field) {
        throw new Error(`Unknown Verikit field "${name}".`);
      }

      return {
        field,
        name,
        value: form.getFieldValue(name),
        error: getFieldError(name),
        onBlur: () => {
          void form.validateField(name, "blur");
        },
        onValueChange: (value) => {
          form.setFieldValue(name, value);
          const { [name]: _removed, ...remaining } = fieldErrors;
          setFieldErrors(remaining);
        },
      };
    },
    [fieldErrors, fields, form, getFieldError],
  );

  return {
    form,
    fields,
    fieldErrors,
    setFieldErrors,
    clearFieldErrors: () => setFieldErrors({}),
    validate,
    submit,
    getFieldError,
    getFieldProps,
  };
}
