import { useForm, type AnyFormApi } from "@tanstack/vue-form";
import type { FieldSchema } from "@verikit/core";
import {
  resolveVerikitFields,
  type VerikitFormSource,
} from "@verikit/ui-core/form/resolve-fields";
import {
  firstFieldError,
  omitFieldError,
  submitVerikitResourceForm,
  type VerikitFieldErrors,
  type VerikitFormFields,
  type VerikitFormValues,
  type VerikitResourceSubmitResult,
} from "@verikit/ui-core/form/submission";
import { ref, type Ref } from "vue";
import type { VerikitFieldComponentProps } from "../fields/types.js";

export {
  isResource,
  resolveVerikitFields,
} from "@verikit/ui-core/form/resolve-fields";
export type { VerikitFormSource } from "@verikit/ui-core/form/resolve-fields";

/** Options for creating a flat Verikit form composable instance. */
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
  /** Current field error messages, reactive to every `submit`/`validate`/`getFieldProps().onValueChange` call. */
  fieldErrors: Ref<VerikitFieldErrors>;
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
  /** Builds props for rendering a field with the registry components. Reactive to the field's current value when read inside a render function or computed. */
  getFieldProps: (name: string) => VerikitFieldComponentProps;
}

/** Creates a TanStack-backed form for a flat Verikit resource schema. */
export function useVerikitForm<TResult = unknown>({
  fields: fieldSource,
  defaultValues = {},
  onSubmit,
}: UseVerikitFormOptions<TResult>): UseVerikitFormResult<TResult> {
  const fields = resolveVerikitFields(fieldSource);
  const fieldErrors = ref<VerikitFieldErrors>({});

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await submit(value);
    },
  });

  // `form.state` is a plain, non-reactive snapshot; `useSelector` bridges
  // tanstack-form's store into Vue reactivity so reads through this ref
  // update templates/computeds the way a React re-render would.
  const values = form.useSelector(
    (state: { values: VerikitFormValues }) => state.values,
  );

  const submit = async (
    values: VerikitFormValues = form.state.values,
  ): Promise<VerikitResourceSubmitResult<TResult | undefined>> => {
    const result = await submitVerikitResourceForm({
      fields,
      values,
      onSubmit,
    });

    fieldErrors.value = result.fieldErrors;

    return result;
  };

  const validate = async (
    values: VerikitFormValues = form.state.values,
  ): Promise<VerikitResourceSubmitResult<undefined>> => {
    const result = await submitVerikitResourceForm({
      fields,
      values,
    });

    fieldErrors.value = result.fieldErrors;

    return result;
  };

  const getFieldError = (name: string): string | undefined =>
    firstFieldError(fieldErrors.value, name);

  const getFieldProps = (name: string): VerikitFieldComponentProps => {
    const field = fields[name] as FieldSchema | undefined;

    if (!field) {
      throw new Error(`Unknown Verikit field "${name}".`);
    }

    return {
      field,
      name,
      value: (values.value as VerikitFormValues)[name],
      error: getFieldError(name),
      onBlur: () => {
        void form.validateField(name, "blur");
      },
      onValueChange: (value: unknown) => {
        form.setFieldValue(name, value);
        fieldErrors.value = omitFieldError(fieldErrors.value, name);
      },
    };
  };

  return {
    form: form as AnyFormApi,
    fields,
    fieldErrors,
    setFieldErrors: (errors: VerikitFieldErrors) => {
      fieldErrors.value = errors;
    },
    clearFieldErrors: () => {
      fieldErrors.value = {};
    },
    validate,
    submit,
    getFieldError,
    getFieldProps,
  };
}
