import { useForm, type AnyFormApi } from "@tanstack/vue-form";
import type { Resource, ResourceSchema, SchemaNode } from "@verikit/core";
import { isResource } from "@verikit/ui-core/form/resolve-fields";
import { pathKey, type SchemaPath } from "@verikit/ui-core/layout/path";
import { submitVerikitSchemaTreeForm } from "@verikit/ui-core/form/schema-tree";
import {
  firstFieldError,
  firstFieldErrors,
  omitFieldError,
  type VerikitFieldErrors,
  type VerikitFormValues,
  type VerikitResourceSubmitResult,
} from "@verikit/ui-core/form/submission";
import { computed, ref, type ComputedRef, type Ref } from "vue";
import type {
  SchemaActionRegistry,
  SchemaRenderProps,
} from "../layout/types.js";

/** Source accepted by the schema tree form composable. */
export type VerikitSchemaTreeSource = Resource | ResourceSchema;

/** Options for creating a schema tree form composable instance. */
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
 * Props from the schema tree composable that can be spread onto the tree renderer.
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
  /** Returns the first error message for a schema path. */
  getFieldError: (path: SchemaPath) => string | undefined;
  /** Renderer props for wiring a schema tree to the composable's state. Reactive: read `.value` inside a render function or computed. */
  treeProps: ComputedRef<VerikitSchemaTreeRenderProps>;
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
  const tree = resolveVerikitTree(resource);
  const fieldErrors = ref<VerikitFieldErrors>({});
  // Stable per-row ids for repeater rows, keyed by the repeater's own path. Grown
  // lazily (per index, as `getRepeaterRowKey` is called during render) to cover rows
  // that arrived some other way than `onRepeaterAdd` (e.g. pre-populated `defaultValues`); shrunk explicitly by `onRepeaterRemove`, which is the only place that knows which index was actually removed.
  const repeaterRowKeys = new Map<string, string[]>();

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await submit(value);
    },
  });

  const values = form.useSelector(
    (state: { values: VerikitFormValues }) => state.values,
  );

  const submit = async (
    values: VerikitFormValues = form.state.values,
  ): Promise<VerikitResourceSubmitResult<TResult | undefined>> => {
    const result = await submitVerikitSchemaTreeForm({
      tree,
      values,
      onSubmit,
    });

    fieldErrors.value = result.fieldErrors;

    return result;
  };

  const validate = async (
    values: VerikitFormValues = form.state.values,
  ): Promise<VerikitResourceSubmitResult<undefined>> => {
    const result = await submitVerikitSchemaTreeForm({ tree, values });

    fieldErrors.value = result.fieldErrors;

    return result;
  };

  const getFieldError = (path: SchemaPath): string | undefined =>
    firstFieldError(fieldErrors.value, pathKey(path));

  const onFieldChange = (path: SchemaPath, value: unknown): void => {
    form.setFieldValue(pathKey(path), value);
    fieldErrors.value = omitFieldError(fieldErrors.value, pathKey(path));
  };

  const onFieldBlur = (path: SchemaPath): void => {
    void form.validateField(pathKey(path), "blur");
  };

  const onRepeaterAdd = (path: SchemaPath): void => {
    form.setFieldValue(pathKey(path), (current: unknown) =>
      Array.isArray(current) ? [...current, {}] : [{}],
    );
  };

  const onRepeaterRemove = (path: SchemaPath, index: number): void => {
    form.setFieldValue(pathKey(path), (current: unknown) =>
      Array.isArray(current)
        ? current.filter((_, itemIndex) => itemIndex !== index)
        : current,
    );
    // Splices the same index out of the cached ids so a row's id always
    // tracks that row, not whatever now sits at its old position.
    repeaterRowKeys.get(pathKey(path))?.splice(index, 1);
  };

  const getRepeaterRowKey = (path: SchemaPath, index: number): string => {
    const key = pathKey(path);
    let ids = repeaterRowKeys.get(key);

    if (!ids) {
      ids = [];
      repeaterRowKeys.set(key, ids);
    }

    while (ids.length <= index) {
      ids.push(crypto.randomUUID());
    }

    return ids[index] as string;
  };

  const errors = computed(() => firstFieldErrors(fieldErrors.value));

  const treeProps = computed<VerikitSchemaTreeRenderProps>(() => ({
    values: values.value as VerikitFormValues,
    errors: errors.value,
    actions,
    onFieldChange,
    onFieldBlur,
    onRepeaterAdd,
    onRepeaterRemove,
    getRepeaterRowKey,
  }));

  return {
    form: form as AnyFormApi,
    tree,
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
    treeProps,
  };
}
