import type {
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActionOptions, ActionResult } from "@verikit/client";
import { useVerikitClient } from "../client/use-verikit-client.js";
import {
  patchCachedListRecord,
  removeCachedListRecord,
  restoreDeletedRecord,
  restoreResourceQueries,
  snapshotResourceQueries,
  type ResourceQuerySnapshot,
} from "./optimistic.js";
import { resourceQueryKeys } from "./query-keys.js";

export type UseCreateResourceOptions<TRecord> = Omit<
  UseMutationOptions<TRecord, Error, Record<string, unknown>>,
  "mutationFn"
>;

/**
 * Creates a resource record, invalidating that resource's list/search queries on success.
 */
export function useCreateResource<TRecord = Record<string, unknown>>(
  name: string,
  options?: UseCreateResourceOptions<TRecord>,
): UseMutationResult<TRecord, Error, Record<string, unknown>> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: (input) => client.resource<TRecord>(name).create(input),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSuccess?.(...args);
    },
  });
}

export interface UpdateResourceVariables {
  id: string;
  input: Record<string, unknown>;
}

export type UseUpdateResourceOptions<TRecord> = Omit<
  UseMutationOptions<TRecord, Error, UpdateResourceVariables>,
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
): UseMutationResult<TRecord, Error, UpdateResourceVariables> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: ({ id, input }) =>
      client.resource<TRecord>(name).update(id, input),
    onMutate: async (
      variables,
      mutationContext,
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

      const caller = await options?.onMutate?.(variables, mutationContext);
      return { snapshot, caller };
    },
    onError: (error, variables, onMutateResult, mutationContext) => {
      if (onMutateResult) {
        restoreResourceQueries(queryClient, onMutateResult.snapshot);
      }
      return options?.onError?.(
        error,
        variables,
        onMutateResult?.caller,
        mutationContext,
      );
    },
    // `keys.all` is a prefix of `keys.find(id)`, so this one call already
    // invalidates both the resource's lists and that specific find(id) entry.
    // Runs in onSettled (not onSuccess) so a failed mutation also forces a
    // refetch: onError's rollback restores a pre-mutation snapshot, which can
    // be stale if a background refetch wrote fresher data while this
    // mutation was in flight.
    onSettled: (data, error, variables, onMutateResult, mutationContext) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSettled?.(
        data,
        error,
        variables,
        onMutateResult?.caller,
        mutationContext,
      );
    },
  });
}

export type UseDeleteResourceOptions = Omit<
  UseMutationOptions<void, Error, string>,
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
): UseMutationResult<void, Error, string> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: (id) => client.resource(name).delete(id),
    onMutate: async (id, mutationContext): Promise<DeleteResourceContext> => {
      await queryClient.cancelQueries({ queryKey: keys.all });
      const snapshot = snapshotResourceQueries(queryClient, keys);

      queryClient.removeQueries({ queryKey: keys.find(id), exact: true });
      removeCachedListRecord(queryClient, keys, id);

      const caller = await options?.onMutate?.(id, mutationContext);
      return { snapshot, caller };
    },
    onError: (error, id, onMutateResult, mutationContext) => {
      if (onMutateResult) {
        restoreDeletedRecord(queryClient, onMutateResult.snapshot, id);
      }
      return options?.onError?.(
        error,
        id,
        onMutateResult?.caller,
        mutationContext,
      );
    },
    onSuccess: (data, id, ...rest) => {
      queryClient.removeQueries({ queryKey: keys.find(id) });
      return options?.onSuccess?.(data, id, ...rest);
    },
// Always refetch after deletion to reconcile optimistic state with the server.
    onSettled: (data, error, id, onMutateResult, mutationContext) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSettled?.(
        data,
        error,
        id,
        onMutateResult?.caller,
        mutationContext,
      );
    },
  });
}

export interface ActionResourceVariables extends ActionOptions {
  input?: Record<string, unknown>;
}

export type UseActionResourceOptions<TResult> = Omit<
  UseMutationOptions<ActionResult<TResult>, Error, ActionResourceVariables>,
  "mutationFn"
>;

/**
 * Runs a named runtime action, invalidating the resource's cached queries on success.
 */
export function useActionResource<TResult = unknown>(
  name: string,
  actionName: string,
  options?: UseActionResourceOptions<TResult>,
): UseMutationResult<ActionResult<TResult>, Error, ActionResourceVariables> {
  const client = useVerikitClient();
  const queryClient = useQueryClient();
  const keys = resourceQueryKeys(name);

  return useMutation({
    ...options,
    mutationFn: ({ input, ...actionOptions }) =>
      client.resource(name).action<TResult>(actionName, input, actionOptions),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSuccess?.(...args);
    },
  });
}
