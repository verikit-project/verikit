import type { ListParams } from "@verikit/client";

export interface ResourceQueryKeys {
  all: readonly [string, string];
  list: (params?: ListParams) => readonly [string, string, "list", ListParams];
  find: (id: string) => readonly [string, string, "find", string];
}

/**
 * Builds the query keys the resource hooks use, so query hooks and mutation
 * hooks' invalidation calls always agree on the same shape. Exported so
 * consumers can invalidate/read the same cache entries themselves (e.g.
 * reacting to a websocket event) without guessing at the internal shape.
 */
export function resourceQueryKeys(name: string): ResourceQueryKeys {
  return {
    all: ["verikit", name] as const,
    list: (params: ListParams = {}) =>
      ["verikit", name, "list", params] as const,
    find: (id: string) => ["verikit", name, "find", id] as const,
  };
}
