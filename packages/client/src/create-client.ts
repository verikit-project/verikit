import { createResourceClient } from "./resource-client.js";
import type { ClientOptions, ResourceClient, VerikitClient } from "./types.js";

/** Builds a `VerikitClient` bound to `options.baseUrl`. */
export function createClient(options: ClientOptions): VerikitClient {
  // `fetchImpl` is invoked as an object method, so bind the global `fetch`
  // to preserve its required receiver in browsers.
  const fetchImpl = options.fetch ?? fetch.bind(globalThis);

  return {
    resource<TRecord = Record<string, unknown>>(
      name: string,
      resourceOptions: { path?: string } = {},
    ): ResourceClient<TRecord> {
      return createResourceClient<TRecord>({
        fetchImpl,
        baseUrl: options.baseUrl,
        headers: options.headers,
        name: resourceOptions.path ?? name,
      });
    },
  };
}
