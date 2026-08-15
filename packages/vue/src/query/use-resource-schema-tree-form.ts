import type { SchemaActionRegistry } from "../layout/types.js";
import { VerikitClientError } from "@verikit/client";
import { computed, watch, type ComputedRef } from "vue";
import {
  useVerikitSchemaTreeForm,
  type UseVerikitSchemaTreeFormResult,
  type VerikitSchemaTreeSource,
} from "../form/use-verikit-schema-tree-form.js";
import {
  validationIssuesToFieldErrors,
  type VerikitFormValues,
} from "@verikit/ui-core/form/submission";
import {
  useCreateResource,
  useUpdateResource,
} from "./use-resource-mutations.js";

/** Options for creating a schema-tree resource form that submits over `@verikit/client`. */
export interface UseResourceSchemaTreeFormOptions<TRecord> {
  /** Updates the record with this id instead of creating a new one. */
  id?: string;
  /** Runtime actions whose forms should render for matching action nodes. */
  actions?: SchemaActionRegistry;
  /** Initial values passed to TanStack Form. */
  defaultValues?: VerikitFormValues;
  /** Called with the created or updated record after a successful submit. */
  onSuccess?: (record: TRecord) => void;
  /**
   * Called when the create/update mutation fails, excluding client-side
   * validation errors surfaced through `fieldErrors` or `submitError`.
   */
  onError?: (error: Error) => void;
}

/** State and helpers returned by {@link useResourceSchemaTreeForm}. */
export interface UseResourceSchemaTreeFormResult<
  TRecord = Record<string, unknown>,
> extends UseVerikitSchemaTreeFormResult<TRecord> {
  /** Whether the create/update mutation is currently in flight. */
  isSubmitting: ComputedRef<boolean>;
  /** Error from the most recent create/update mutation, if any. */
  submitError: ComputedRef<Error | null>;
}

/**
 * Schema-tree sibling of `useResourceForm`: same resource-backed
 * create/update wiring, but built on `useVerikitSchemaTreeForm` so the
 * rendered tree  and therefore relationships and conditional fields  is
 * available to a tree-aware renderer like `ResourceForm`, instead of the
 * flat field list `useResourceForm` exposes.
 */
export function useResourceSchemaTreeForm<TRecord = Record<string, unknown>>(
  resource: VerikitSchemaTreeSource,
  {
    id,
    actions,
    defaultValues,
    onSuccess,
    onError,
  }: UseResourceSchemaTreeFormOptions<TRecord> = {},
): UseResourceSchemaTreeFormResult<TRecord> {
  const create = useCreateResource<TRecord>(resource.name, { onError });
  const update = useUpdateResource<TRecord>(resource.name, { onError });
  const form = useVerikitSchemaTreeForm<TRecord>({
    resource,
    actions,
    defaultValues,
    onSubmit: async (values) => {
      const record = id
        ? await update.mutateAsync({ id, input: values })
        : await create.mutateAsync(values);

      onSuccess?.(record);
      return record;
    },
  });
  const mutationError = computed(() =>
    id ? update.error.value : create.error.value,
  );

  // Only fires on an actual change of `mutationError` (Vue's `watch` skips
  // no-op calls when the computed's value is unchanged), so a structured
  // server error is mapped onto the form's field errors exactly once.
  watch(mutationError, (error) => {
    if (error instanceof VerikitClientError && error.issues) {
      form.setFieldErrors(validationIssuesToFieldErrors(error.issues));
    }
  });

  return {
    ...form,
    isSubmitting: computed(
      () => create.isPending.value || update.isPending.value,
    ),
    submitError: mutationError,
  };
}
