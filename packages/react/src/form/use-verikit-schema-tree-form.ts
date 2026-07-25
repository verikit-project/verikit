import { useCallback, useMemo, useState } from "react";
import { useForm, type AnyFormApi } from "@tanstack/react-form";
import type { Resource, ResourceSchema, SchemaNode } from "@verikit/core";
import { pathKey, type SchemaPath } from "../layout/path.js";
import type { SchemaRenderProps } from "../layout/types.js";
import { isResource } from "./use-verikit-form.js";
import { submitVerikitSchemaTreeForm } from "./schema-tree.js";
import {
  firstFieldError,
  firstFieldErrors,
  type VerikitFieldErrors,
  type VerikitFormValues,
  type VerikitResourceSubmitResult,
} from "./submission.js";

export type VerikitSchemaTreeSource = Resource | ResourceSchema;

export interface UseVerikitSchemaTreeFormOptions<TResult = unknown> {
  resource: VerikitSchemaTreeSource;
  defaultValues?: VerikitFormValues;
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

export type VerikitSchemaTreeRenderProps = Pick<
  SchemaRenderProps,
  | "values"
  | "errors"
  | "onFieldChange"
  | "onFieldBlur"
  | "onRepeaterAdd"
  | "onRepeaterRemove"
>;

export interface UseVerikitSchemaTreeFormResult<TResult = unknown> {
  form: AnyFormApi;
  tree: SchemaNode[];
  fieldErrors: VerikitFieldErrors;
  setFieldErrors: (errors: VerikitFieldErrors) => void;
  clearFieldErrors: () => void;
  validate: (
    values?: VerikitFormValues,
  ) => Promise<VerikitResourceSubmitResult<undefined>>;
  submit: (
    values?: VerikitFormValues,
  ) => Promise<VerikitResourceSubmitResult<TResult | undefined>>;
  getFieldError: (path: SchemaPath) => string | undefined;
  treeProps: VerikitSchemaTreeRenderProps;
}

function resolveVerikitTree(source: VerikitSchemaTreeSource): SchemaNode[] {
  return isResource(source) ? source.toSchema().tree : source.tree;
}

export function useVerikitSchemaTreeForm<TResult = unknown>({
  resource,
  defaultValues = {},
  onSubmit,
}: UseVerikitSchemaTreeFormOptions<TResult>): UseVerikitSchemaTreeFormResult<TResult> {
  const tree = useMemo(() => resolveVerikitTree(resource), [resource]);
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
      const result = await submitVerikitSchemaTreeForm({
        tree,
        values,
        onSubmit,
      });

      setFieldErrors(result.fieldErrors);

      return result;
    },
    [tree, form, onSubmit],
  );

  const validate = useCallback(
    async (
      values: VerikitFormValues = form.state.values,
    ): Promise<VerikitResourceSubmitResult<undefined>> => {
      const result = await submitVerikitSchemaTreeForm({ tree, values });

      setFieldErrors(result.fieldErrors);

      return result;
    },
    [tree, form],
  );

  const getFieldError = useCallback(
    (path: SchemaPath) => firstFieldError(fieldErrors, pathKey(path)),
    [fieldErrors],
  );

  const onFieldChange = useCallback(
    (path: SchemaPath, value: unknown) => {
      form.setFieldValue(pathKey(path), value);
      const key = pathKey(path);
      const { [key]: _removed, ...remaining } = fieldErrors;
      setFieldErrors(remaining);
    },
    [fieldErrors, form],
  );

  const onFieldBlur = useCallback(
    (path: SchemaPath) => {
      void form.validateField(pathKey(path), "blur");
    },
    [form],
  );

  const onRepeaterAdd = useCallback(
    (path: SchemaPath) => {
      form.setFieldValue(pathKey(path), (current: unknown) =>
        Array.isArray(current) ? [...current, {}] : [{}],
      );
    },
    [form],
  );

  const onRepeaterRemove = useCallback(
    (path: SchemaPath, index: number) => {
      form.setFieldValue(pathKey(path), (current: unknown) =>
        Array.isArray(current)
          ? current.filter((_, itemIndex) => itemIndex !== index)
          : current,
      );
    },
    [form],
  );

  const errors = useMemo(() => firstFieldErrors(fieldErrors), [fieldErrors]);

  return {
    form,
    tree,
    fieldErrors,
    setFieldErrors,
    clearFieldErrors: () => setFieldErrors({}),
    validate,
    submit,
    getFieldError,
    treeProps: {
      values: form.state.values,
      errors,
      onFieldChange,
      onFieldBlur,
      onRepeaterAdd,
      onRepeaterRemove,
    },
  };
}
