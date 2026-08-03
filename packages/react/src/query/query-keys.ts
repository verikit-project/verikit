import type { ListParams } from "@verikit/client";

/**
 * Builds the query keys the resource hooks use, so query hooks and mutation
 * hooks' invalidation calls always agree on the same shape. Internal only 
 * not part of this package's public surface.
 */
export function resourceQueryKeys(name: string) {
  return {
    all: ["verikit", name] as const,
    list: (params: ListParams = {}) =>
      ["verikit", name, "list", params] as const,
    find: (id: string) => ["verikit", name, "find", id] as const,
  };
}
