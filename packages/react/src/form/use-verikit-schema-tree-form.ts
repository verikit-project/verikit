import { useCallback, useMemo, useRef, useState } from "react";
import { useForm, type AnyFormApi } from "@tanstack/react-form";
import type { Resource, ResourceSchema, SchemaNode } from "@verikit/core";
import { pathKey, type SchemaPath } from "../layout/path.js";
import type {
  SchemaActionRegistry,
  SchemaRenderProps,
} from "../layout/types.js";
import { isResource } from "./use-verikit-form.js";
import { submitVerikitSchemaTreeForm } from "./schema-tree.js";
import {
  firstFieldError,
  firstFieldErrors,
  omitFieldError,
  type VerikitFieldErrors,
  type VerikitFormValues,
  type VerikitResourceSubmitResult,
} from "./submission.js";

/** Source accepted by the schema tree form hook. */
export type VerikitSchemaTreeSource = Resource | ResourceSchema;

/** Options for creating a schema tree form hook instance. */
export interface UseVerikitSchemaTreeFormOptions<TResult = unknown> {
  /** Resource builder or schema containing the tree to render. */
  resource: VerikitSchemaTreeSource;
  /** Runtime actions whose forms should render for matching action nodes. */
  actions?: SchemaActionRegistry;
  /** Initial values passed to TanStack Form. */
  defaultValues?: VerikitFormValues;
  /** Callback invoked after successful inference and validation. */
  onSubmit?: (values: VerikitFormValues) => TResult | Promise<TResult>;
}

/**
 * Props from the schema tree hook that can be spread onto the tree renderer.
 */
export type VerikitSchemaTreeRenderProps = Pick<
  SchemaRenderProps,
  | "values"
  | "errors"
  | "actions"
  | "onFieldChange"
  | "onFieldBlur"
  | "onRepeaterAdd"
  | "onRepeaterRemove"
  | "getRepeaterRowKey"
>;

/** State and helpers returned by {@link useVerikitSchemaTreeForm}. */
export interface UseVerikitSchemaTreeFormResult<TResult = unknown> {
  /** Underlying TanStack Form API instance. */
  form: AnyFormApi;
  /** Resolved schema tree nodes. */
  tree: SchemaNode[];
  /** Current field error messages keyed by schema path. */
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
  /** Returns the first error message for a schema path. */
  getFieldError: (path: SchemaPath) => string | undefined;
  /** Renderer props for wiring a schema tree to the hook state. */
  treeProps: VerikitSchemaTreeRenderProps;
}

function resolveVerikitTree(source: VerikitSchemaTreeSource): SchemaNode[] {
  return isResource(source) ? source.toSchema().tree : source.tree;
}

/** Creates a TanStack-backed form for a Verikit schema tree. */
export function useVerikitSchemaTreeForm<TResult = unknown>({
  resource,
  actions,
  defaultValues = {},
  onSubmit,
}: UseVerikitSchemaTreeFormOptions<TResult>): UseVerikitSchemaTreeFormResult<TResult> {
  const tree = useMemo(() => resolveVerikitTree(resource), [resource]);
  const [fieldErrors, setFieldErrors] = useState<VerikitFieldErrors>({});
  // Stable per-row ids for repeater rows, keyed by the repeater's own path. Grown
  // lazily (per index, as `getRepeaterRowKey` is called during render) to cover rows
  // that arrived some other way than `onRepeaterAdd` (e.g. pre-populated `defaultValues`); shrunk explicitly by `onRepeaterRemove`, which is the only place that knows which index was actually removed.
  const repeaterRowKeysRef = useRef<Map<string, string[]>>(new Map());
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
      // Functional update: two `onFieldChange` calls in the same tick (e.g. rapid edits to
      // different fields before a re-render) would otherwise both close over the same
      // stale `fieldErrors` snapshot, so the second call's `setFieldErrors` would silently undo the first call's removal.
      setFieldErrors((current) => omitFieldError(current, key));
    },
    [form],
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
      // Splices the same index out of the cached ids so a row's id always
      // tracks that row, not whatever now sits at its old position.
      repeaterRowKeysRef.current.get(pathKey(path))?.splice(index, 1);
    },
    [form],
  );

  const getRepeaterRowKey = useCallback(
    (path: SchemaPath, index: number): string => {
      const key = pathKey(path);
      let ids = repeaterRowKeysRef.current.get(key);

      if (!ids) {
        ids = [];
        repeaterRowKeysRef.current.set(key, ids);
      }

      while (ids.length <= index) {
        ids.push(crypto.randomUUID());
      }

      return ids[index] as string;
    },
    [],
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
      actions,
      onFieldChange,
      onFieldBlur,
      onRepeaterAdd,
      onRepeaterRemove,
      getRepeaterRowKey,
    },
  };
}
