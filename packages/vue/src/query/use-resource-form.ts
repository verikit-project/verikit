import type { Resource, ResourceSchema } from "@verikit/core";
import { computed, type ComputedRef } from "vue";
import type { UseVerikitFormResult } from "../form/use-verikit-form.js";
import { useVerikitForm } from "../form/use-verikit-form.js";
import type { VerikitFormValues } from "@verikit/ui-core/form/submission";
import {
  useCreateResource,
  useUpdateResource,
} from "./use-resource-mutations.js";

/** A resource builder or its finalized schema  either carries its own name. */
export type UseResourceFormSource = Resource | ResourceSchema;

/** Options for creating a resource-backed form that submits over `@verikit/client`. */
export interface UseResourceFormOptions<TRecord> {
  /** Updates the record with this id instead of creating a new one. */
  id?: string;
  /** Initial values passed to TanStack Form. */
  defaultValues?: VerikitFormValues;
  /** Called with the created or updated record after a successful submit. */
  onSuccess?: (record: TRecord) => void;
  /**
   * Called when the create/update mutation fails, not for client-side
   * validation errors, which surface through `fieldErrors`/`submitError`.
   */
  onError?: (error: Error) => void;
}

/** State and helpers returned by {@link useResourceForm}. */
export interface UseResourceFormResult<
  TRecord = Record<string, unknown>,
> extends UseVerikitFormResult<TRecord> {
  /** Whether the create/update mutation is currently in flight. */
  isSubmitting: ComputedRef<boolean>;
  /** Error from the most recent create/update mutation, if any. */
  submitError: ComputedRef<Error | null>;
}

/**
 * Resource-backed form composable that uses the resource as the source of
 * truth for fields, validation, and create/update mutations. Creates when no
 * `id` is provided; otherwise updates the specified record.
 */
export function useResourceForm<TRecord = Record<string, unknown>>(
  resource: UseResourceFormSource,
  {
    id,
    defaultValues,
    onSuccess,
    onError,
  }: UseResourceFormOptions<TRecord> = {},
): UseResourceFormResult<TRecord> {
  const create = useCreateResource<TRecord>(resource.name, { onError });
  const update = useUpdateResource<TRecord>(resource.name, { onError });

  const form = useVerikitForm<TRecord>({
    fields: resource,
    defaultValues,
    onSubmit: async (values) => {
      const record = id
        ? await update.mutateAsync({ id, input: values })
        : await create.mutateAsync(values);

      onSuccess?.(record);
      return record;
    },
  });

  return {
    ...form,
    isSubmitting: computed(
      () => create.isPending.value || update.isPending.value,
    ),
    submitError: computed(() => create.error.value ?? update.error.value),
  };
}
