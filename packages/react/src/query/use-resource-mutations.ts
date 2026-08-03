import type {
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActionOptions, ActionResult } from "@verikit/client";
import { useVerikitClient } from "../client/use-verikit-client.js";
import { resourceQueryKeys } from "./query-keys.js";

export type UseCreateResourceOptions<TRecord> = Omit<
  UseMutationOptions<TRecord, Error, Record<string, unknown>>,
  "mutationFn"
>;

/** Creates a resource record, invalidating that resource's list/search queries on success. */
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

/** Updates a resource record, invalidating its list/search and find(id) queries on success. */
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
    // `keys.all` is a prefix of `keys.find(id)`, so this one call already
    // invalidates both the resource's lists and that specific find(id) entry.
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      return options?.onSuccess?.(...args);
    },
  });
}

export type UseDeleteResourceOptions = Omit<
  UseMutationOptions<void, Error, string>,
  "mutationFn"
>;

/**
 * Deletes a resource record by id: invalidates its list/search queries and
 * removes (rather than refetches) that id's cached `find` entry, since
 * refetching a known-deleted record would just 404.
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
    onSuccess: (data, id, ...rest) => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      queryClient.removeQueries({ queryKey: keys.find(id) });
      return options?.onSuccess?.(data, id, ...rest);
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

/** Runs a named runtime action, invalidating the resource's cached queries on success. */
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
