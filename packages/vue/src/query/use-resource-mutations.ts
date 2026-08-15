import type {
  MutationFunctionContext,
  MutationOptions,
  UseMutationReturnType,
} from "@tanstack/vue-query";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { ActionOptions, ActionResult } from "@verikit/client";
import { useVerikitClient } from "../client/use-verikit-client.js";
import {
  patchCachedListRecord,
  removeCachedListRecord,
  restoreDeletedRecord,
  restoreResourceQueries,
  snapshotResourceQueries,
  type ResourceQuerySnapshot,
} from "@verikit/ui-core/query/optimistic";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";

export type UseCreateResourceOptions<TRecord> = Omit<
  MutationOptions<TRecord, Error, Record<string, unknown>>,
  "mutationFn"
>;

/**
 * Creates a resource record, invalidating that resource's list/search queries on success.
 */
export function useCreateResource<TRecord = Record<string, unknown>>(
  name: string,
  options?: UseCreateResourceOptions<TRecord>,
): UseMutationReturnType<TRecord, Error, Record<string, unknown>, unknown> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: (input: Record<string, unknown>) =>
      client.resource<TRecord>(name).create(input),
    onSuccess: (
      data: TRecord,
      variables: Record<string, unknown>,
      onMutateResult: unknown,
      context: MutationFunctionContext,
    ) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export interface UpdateResourceVariables {
  id: string;
  input: Record<string, unknown>;
}

export type UseUpdateResourceOptions<TRecord> = Omit<
  MutationOptions<TRecord, Error, UpdateResourceVariables>,
  "mutationFn"
>;

interface UpdateResourceContext {
  snapshot: ResourceQuerySnapshot;
  caller: unknown;
}

/**
 * Updates a resource record. Optimistically merges `input` into the cached `find(id)` record and any matching row in a cached list, rolling back to the pre-mutation snapshot on error; invalidates its list/search and find(id) queries on success (so any field the server computed, not just what was sent, ends up correct).
 */
export function useUpdateResource<TRecord = Record<string, unknown>>(
  name: string,
  options?: UseUpdateResourceOptions<TRecord>,
): UseMutationReturnType<
  TRecord,
  Error,
  UpdateResourceVariables,
  UpdateResourceContext
> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: ({ id, input }: UpdateResourceVariables) =>
      client.resource<TRecord>(name).update(id, input),
    onMutate: async (
      variables: UpdateResourceVariables,
      context: MutationFunctionContext,
    ): Promise<UpdateResourceContext> => {
      await queryClient.cancelQueries({ queryKey: keys.all });
      const snapshot = snapshotResourceQueries(queryClient, keys);

      queryClient.setQueryData<TRecord>(keys.find(variables.id), (current) =>
        current ? ({ ...current, ...variables.input } as TRecord) : current,
      );
      patchCachedListRecord<TRecord>(
        queryClient,
        keys,
        variables.id,
        (record) => ({ ...record, ...variables.input }),
      );

      const caller = await options?.onMutate?.(variables, context);
      return { snapshot, caller };
    },
    onError: (
      error: Error,
      variables: UpdateResourceVariables,
      onMutateResult: UpdateResourceContext | undefined,
      context: MutationFunctionContext,
    ) => {
      if (onMutateResult) {
        restoreResourceQueries(queryClient, onMutateResult.snapshot);
      }
      return options?.onError?.(
        error,
        variables,
        onMutateResult?.caller,
        context,
      );
    },
    // `keys.all` prefixes `keys.find(id)`, so this one invalidate covers
    // both. Runs in onSettled (not onSuccess) so a failed mutation still
    // forces a refetch, since onError's rollback can be stale by then.
    onSettled: (
      data: TRecord | undefined,
      error: Error | null,
      variables: UpdateResourceVariables,
      onMutateResult: UpdateResourceContext | undefined,
      context: MutationFunctionContext,
    ) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSettled?.(
        data,
        error,
        variables,
        onMutateResult?.caller,
        context,
      );
    },
  });
}

export type UseDeleteResourceOptions = Omit<
  MutationOptions<void, Error, string>,
  "mutationFn"
>;

interface DeleteResourceContext {
  snapshot: ResourceQuerySnapshot;
  caller: unknown;
}

/**
 * Deletes a resource record by id. Optimistically removes it from any cached list and evicts its `find(id)` cache entry outright. On error it restores only that record from its snapshot, preserving concurrent sibling deletes; on success, it invalidates list/search queries and (redundantly but harmlessly) re-evicts `find(id)`, since refetching a known-deleted record would just 404.
 */
export function useDeleteResource(
  name: string,
  options?: UseDeleteResourceOptions,
): UseMutationReturnType<void, Error, string, DeleteResourceContext> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: (id: string) => client.resource(name).delete(id),
    onMutate: async (
      id: string,
      context: MutationFunctionContext,
    ): Promise<DeleteResourceContext> => {
      await queryClient.cancelQueries({ queryKey: keys.all });
      const snapshot = snapshotResourceQueries(queryClient, keys);

      queryClient.removeQueries({ queryKey: keys.find(id), exact: true });
      removeCachedListRecord(queryClient, keys, id);

      const caller = await options?.onMutate?.(id, context);
      return { snapshot, caller };
    },
    onError: (
      error: Error,
      id: string,
      onMutateResult: DeleteResourceContext | undefined,
      context: MutationFunctionContext,
    ) => {
      if (onMutateResult) {
        restoreDeletedRecord(queryClient, onMutateResult.snapshot, id);
      }
      return options?.onError?.(error, id, onMutateResult?.caller, context);
    },
    onSuccess: (
      data: void,
      id: string,
      onMutateResult: DeleteResourceContext | undefined,
      context: MutationFunctionContext,
    ) => {
      queryClient.removeQueries({ queryKey: keys.find(id) });
      return options?.onSuccess?.(data, id, onMutateResult?.caller, context);
    },
    // Always refetch after deletion to reconcile optimistic state with the server.
    onSettled: (
      data: void | undefined,
      error: Error | null,
      id: string,
      onMutateResult: DeleteResourceContext | undefined,
      context: MutationFunctionContext,
    ) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSettled?.(
        data,
        error,
        id,
        onMutateResult?.caller,
        context,
      );
    },
  });
}

export interface ActionResourceVariables extends ActionOptions {
  input?: Record<string, unknown>;
}

export type UseActionResourceOptions<TResult> = Omit<
  MutationOptions<ActionResult<TResult>, Error, ActionResourceVariables>,
  "mutationFn"
>;

/**
 * Runs a named runtime action, invalidating the resource's cached queries on success.
 */
export function useActionResource<TResult = unknown>(
  name: string,
  actionName: string,
  options?: UseActionResourceOptions<TResult>,
): UseMutationReturnType<
  ActionResult<TResult>,
  Error,
  ActionResourceVariables,
  unknown
> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: ({ input, ...actionOptions }: ActionResourceVariables) =>
      client.resource(name).action<TResult>(actionName, input, actionOptions),
    onSuccess: (
      data: ActionResult<TResult>,
      variables: ActionResourceVariables,
      onMutateResult: unknown,
      context: MutationFunctionContext,
    ) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
