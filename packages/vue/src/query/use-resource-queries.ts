import type { UseQueryOptions, UseQueryReturnType } from "@tanstack/vue-query";
import { useQuery } from "@tanstack/vue-query";
import type { ListParams, ListResponse } from "@verikit/client";
import { useVerikitClient } from "../client/use-verikit-client.js";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";

export type UseListResourceOptions<TRecord> = Omit<
  UseQueryOptions<ListResponse<TRecord>, Error>,
  "queryKey" | "queryFn"
>;

/** Lists a resource's records, cached per resource name + params. */
export function useListResource<TRecord = Record<string, unknown>>(
  name: string,
  params: ListParams = {},
  options?: UseListResourceOptions<TRecord>,
): UseQueryReturnType<ListResponse<TRecord>, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name).list(params),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client.resource<TRecord>(name).list(params, { signal }),
    ...options,
  });
}

export type UseFindResourceOptions<TRecord> = Omit<
  UseQueryOptions<TRecord, Error>,
  "queryKey" | "queryFn"
>;

/** Fetches a single resource record by id, cached per resource name + id. */
export function useResourceFind<TRecord = Record<string, unknown>>(
  name: string,
  id: string,
  options?: UseFindResourceOptions<TRecord>,
): UseQueryReturnType<TRecord, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name).find(id),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client.resource<TRecord>(name).find(id, { signal }),
    ...options,
  });
}

export type UseResourceRelationshipOptions<TTarget> = Omit<
  UseQueryOptions<ListResponse<TTarget>, Error>,
  "queryKey" | "queryFn"
>;

/**
 * Lists selectable records for a `belongsTo` relationship, cached by
 * resource, relationship, and params. Server-side permissions and scopes apply.
 */
export function useResourceRelationship<TTarget = Record<string, unknown>>(
  name: string,
  relationshipName: string,
  params: ListParams = {},
  options?: UseResourceRelationshipOptions<TTarget>,
): UseQueryReturnType<ListResponse<TTarget>, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name).relationship(relationshipName, params),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      client
        .resource(name)
        .relationship<TTarget>(relationshipName, params, { signal }),
    ...options,
  });
}
