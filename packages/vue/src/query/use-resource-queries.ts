import type { UseQueryOptions, UseQueryReturnType } from "@tanstack/vue-query";
import { useQuery } from "@tanstack/vue-query";
import type {
  FindWithActionsResponse,
  ListParams,
  ListResponse,
} from "@verikit/client";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useVerikitClient } from "../client/use-verikit-client.js";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";

export type UseListResourceOptions<TRecord extends object> = Omit<
  UseQueryOptions<ListResponse<TRecord>, Error>,
  "queryKey" | "queryFn"
>;

/** Lists a resource's records, cached per resource name + params. */
export function useListResource<
  TRecord extends object = Record<string, unknown>,
>(
  name: string,
  params: ListParams<TRecord> = {},
  options?: UseListResourceOptions<TRecord>,
): UseQueryReturnType<ListResponse<TRecord>, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name, client).list(params),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client.resource<TRecord>(name).list(params, { signal }),
    ...options,
  });
}

export type UseFindResourceOptions<TRecord extends object> = Omit<
  UseQueryOptions<TRecord, Error>,
  "queryKey" | "queryFn"
>;

/** Fetches a single resource record by id, cached per resource name + id. */
export function useResourceFind<
  TRecord extends object = Record<string, unknown>,
>(
  name: string,
  id: string,
  options?: UseFindResourceOptions<TRecord>,
): UseQueryReturnType<TRecord, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name, client).find(id),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client.resource<TRecord>(name).find(id, { signal }),
    ...options,
  });
}

export type UseFindWithActionsResourceOptions<TRecord extends object> = Omit<
  UseQueryOptions<FindWithActionsResponse<TRecord>, Error>,
  "queryKey" | "queryFn"
>;

/**
 * Fetches a single record by id along with the record-scoped actions the caller can't run on it, cached per resource name + id. `id` may be a ref or getter, refetching when it changes.
 */
export function useResourceFindWithActions<
  TRecord extends object = Record<string, unknown>,
>(
  name: string,
  id: MaybeRefOrGetter<string>,
  options?: UseFindWithActionsResourceOptions<TRecord>,
): UseQueryReturnType<FindWithActionsResponse<TRecord>, Error> {
  const client = useVerikitClient();
  const keys = resourceQueryKeys(name, client);

  return useQuery({
    queryKey: computed(() => keys.findWithActions(toValue(id))),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client.resource<TRecord>(name).findWithActions(toValue(id), { signal }),
    ...options,
  });
}

export type UseResourceRelationshipOptions<TTarget extends object> = Omit<
  UseQueryOptions<ListResponse<TTarget>, Error>,
  "queryKey" | "queryFn"
>;

/**
 * Lists selectable records for a `belongsTo` relationship, cached by
 * resource, relationship, and params. Server-side permissions and scopes apply.
 */
export function useResourceRelationship<
  TTarget extends object = Record<string, unknown>,
>(
  name: string,
  relationshipName: string,
  params: ListParams<TTarget> = {},
  options?: UseResourceRelationshipOptions<TTarget>,
): UseQueryReturnType<ListResponse<TTarget>, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name, client).relationship(
      relationshipName,
      params,
    ),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client
        .resource(name)
        .relationship<TTarget>(relationshipName, params, { signal }),
    ...options,
  });
}
