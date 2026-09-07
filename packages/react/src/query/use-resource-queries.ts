import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import type { ListParams, ListResponse } from "@verikit/client";
import { useVerikitClient } from "../client/use-verikit-client.js";
import { resourceQueryKeys } from "@verikit/ui-core/query/query-keys";

export type UseListResourceOptions<TRecord extends object> = Omit<
  UseQueryOptions<ListResponse<TRecord>, Error>,
  "queryKey" | "queryFn"
>;

/** Lists a resource's records, cached per resource name + params. */
export function useListResource<TRecord extends object = Record<string, unknown>>(
  name: string,
  params: ListParams<TRecord> = {},
  options?: UseListResourceOptions<TRecord>,
): UseQueryResult<ListResponse<TRecord>, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name, client).list(params),
    queryFn: ({ signal }) =>
      client.resource<TRecord>(name).list(params, { signal }),
    ...options,
  });
}

export type UseFindResourceOptions<TRecord extends object> = Omit<
  UseQueryOptions<TRecord, Error>,
  "queryKey" | "queryFn"
>;

/** Fetches a single resource record by id, cached per resource name + id. */
export function useResourceFind<TRecord extends object = Record<string, unknown>>(
  name: string,
  id: string,
  options?: UseFindResourceOptions<TRecord>,
): UseQueryResult<TRecord, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name, client).find(id),
    queryFn: ({ signal }) =>
      client.resource<TRecord>(name).find(id, { signal }),
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
): UseQueryResult<ListResponse<TTarget>, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name, client).relationship(
      relationshipName,
      params,
    ),
    queryFn: ({ signal }) =>
      client
        .resource(name)
        .relationship<TTarget>(relationshipName, params, { signal }),
    ...options,
  });
}
