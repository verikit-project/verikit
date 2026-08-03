import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import type { ListParams, ListResponse } from "@verikit/client";
import { useVerikitClient } from "../client/use-verikit-client.js";
import { resourceQueryKeys } from "./query-keys.js";

export type UseListResourceOptions<TRecord> = Omit<
  UseQueryOptions<ListResponse<TRecord>, Error>,
  "queryKey" | "queryFn"
>;

/** Lists a resource's records, cached per resource name + params. */
export function useListResource<TRecord = Record<string, unknown>>(
  name: string,
  params: ListParams = {},
  options?: UseListResourceOptions<TRecord>,
): UseQueryResult<ListResponse<TRecord>, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name).list(params),
    queryFn: ({ signal }) =>
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
): UseQueryResult<TRecord, Error> {
  const client = useVerikitClient();

  return useQuery({
    queryKey: resourceQueryKeys(name).find(id),
    queryFn: ({ signal }) =>
      client.resource<TRecord>(name).find(id, { signal }),
    ...options,
  });
}
