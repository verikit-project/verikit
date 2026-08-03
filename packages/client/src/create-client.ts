import { createResourceClient } from "./resource-client.js";
import type { ClientOptions, ResourceClient, VerikitClient } from "./types.js";

/** Builds a `VerikitClient` bound to `options.baseUrl`. */
export function createClient(options: ClientOptions): VerikitClient {
  const fetchImpl = options.fetch ?? fetch;

  return {
    resource<TRecord = Record<string, unknown>>(
      name: string,
    ): ResourceClient<TRecord> {
      return createResourceClient<TRecord>({
        fetchImpl,
        baseUrl: options.baseUrl,
        headers: options.headers,
        name,
      });
    },
  };
}
