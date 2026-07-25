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

export type VerikitFormSource = VerikitFormFields | Resource | ResourceSchema;

export interface UseVerikitFormOptions<TResult = unknown> {
  fields: VerikitFormSource;
  defaultValues?: VerikitFormValues;
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

export interface UseVerikitFormResult<TResult = unknown> {
  form: AnyFormApi;
  fields: VerikitFormFields;
  fieldErrors: VerikitFieldErrors;
  setFieldErrors: (errors: VerikitFieldErrors) => void;
  clearFieldErrors: () => void;
  validate: (
    values?: VerikitFormValues,
  ) => Promise<VerikitResourceSubmitResult<undefined>>;
  submit: (
    values?: VerikitFormValues,
  ) => Promise<VerikitResourceSubmitResult<TResult | undefined>>;
  getFieldError: (name: string) => string | undefined;
  getFieldProps: (name: string) => VerikitFieldComponentProps;
}

function isResource(value: VerikitFormSource): value is Resource {
  return typeof (value as Resource).toSchema === "function";
}

function isResourceSchema(value: VerikitFormSource): value is ResourceSchema {
  return (value as ResourceSchema).type === "resource";
}

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
