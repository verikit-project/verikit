import type { Resource, ResourceSchema } from "@verikit/core";
import type { UseVerikitFormResult } from "../form/use-verikit-form.js";
import { useVerikitForm } from "../form/use-verikit-form.js";
import type { VerikitFormValues } from "../form/submission.js";
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
 * The single resource-backed form hook: takes a `Resource` (or its
 * `ResourceSchema`) and wires `useVerikitForm` straight to its create/update
 * mutation hooks  its own name is the one source of truth for both the
 * fields and which resource to submit to, so there's no separate `name`
 * string or raw field map to keep in sync with it. Submitting infers,
 * validates, and sends the request in one step. Creates when no `id` option
 * is given, updates that record's id otherwise.
 */
export function useResourceForm<TRecord = Record<string, unknown>>(
  resource: UseResourceFormSource,
  { id, defaultValues, onSuccess }: UseResourceFormOptions<TRecord> = {},
): UseResourceFormResult<TRecord> {
  const create = useCreateResource<TRecord>(resource.name);
  const update = useUpdateResource<TRecord>(resource.name);

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
    isSubmitting: create.isPending || update.isPending,
    submitError: create.error ?? update.error,
  };
}
