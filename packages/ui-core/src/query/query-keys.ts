import type { ListParams, VerikitClient } from "@verikit/client";

export interface ResourceQueryKeys {
  all: readonly [string, string, string];
  list: (
    params?: ListParams,
  ) => readonly [string, string, string, "list", ListParams];
  find: (id: string) => readonly [string, string, string, "find", string];
  /** Kept apart from `find` because its cached data has a different shape. */
  findWithActions: (
    id: string,
  ) => readonly [string, string, string, "findWithActions", string];
  relationship: (
    relationshipName: string,
    params?: ListParams,
  ) => readonly [string, string, string, "relationship", string, ListParams];
}

const clientNamespaces = new WeakMap<VerikitClient, string>();

/**
 * Builds keys scoped to a client or explicit cache namespace. Pass the same
 * client used by VerikitProvider when reading or invalidating queries manually.
 * A namespace must never be shared across different APIs or access identities.
 */
export function resourceQueryKeys(
  name: string,
  client: VerikitClient | string,
): ResourceQueryKeys {
  let namespace: string;
  if (typeof client === "string") {
    namespace = client;
  } else {
    namespace =
      client.cacheNamespace ??
      clientNamespaces.get(client) ??
      crypto.randomUUID();
    clientNamespaces.set(client, namespace);
  }
  return {
    all: ["verikit", namespace, name] as const,
    list: (params: ListParams = {}) =>
      ["verikit", namespace, name, "list", params] as const,
    find: (id: string) => ["verikit", namespace, name, "find", id] as const,
    findWithActions: (id: string) =>
      ["verikit", namespace, name, "findWithActions", id] as const,
    relationship: (relationshipName: string, params: ListParams = {}) =>
      [
        "verikit",
        namespace,
        name,
        "relationship",
        relationshipName,
        params,
      ] as const,
  };
}
