import type {
  UseVerikitFormResult,
  VerikitFormSource,
} from "../form/use-verikit-form.js";
import { useVerikitForm } from "../form/use-verikit-form.js";
import type { VerikitFormValues } from "../form/submission.js";
import {
  useCreateResource,
  useUpdateResource,
} from "./use-resource-mutations.js";

/** Options for creating a resource-backed form that submits over `@verikit/client`. */
export interface UseResourceFormOptions<TRecord> {
  /** Fields, resource builder, or resource schema backing the form. */
  fields: VerikitFormSource;
  /** Updates the record with this id instead of creating a new one. */
  id?: string;
  /** Initial values passed to TanStack Form. */
  defaultValues?: VerikitFormValues;
  /** Called with the created or updated record after a successful submit. */
  onSuccess?: (record: TRecord) => void;
}

/** State and helpers returned by {@link useResourceForm}. */
export interface UseResourceFormResult<
  TRecord = Record<string, unknown>,
> extends UseVerikitFormResult<TRecord> {
  /** Whether the create/update mutation is currently in flight. */
  isSubmitting: boolean;
  /** Error from the most recent create/update mutation, if any. */
  submitError: Error | null;
}

/**
 * Wires `useVerikitForm` directly to a resource's create/update mutation
 * hooks, so submitting infers, validates, and sends the request in one
 * step rather than leaving that plumbing to a hand-written `onSubmit`.
 * Creates when no `id` is given, updates that record's id otherwise.
 */
export function useResourceForm<TRecord = Record<string, unknown>>(
  name: string,
  { fields, id, defaultValues, onSuccess }: UseResourceFormOptions<TRecord>,
): UseResourceFormResult<TRecord> {
  const create = useCreateResource<TRecord>(name);
  const update = useUpdateResource<TRecord>(name);

  const form = useVerikitForm<TRecord>({
    fields,
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
    isSubmitting: create.isPending || update.isPending,
    submitError: create.error ?? update.error,
  };
}
