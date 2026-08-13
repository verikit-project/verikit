import { createResourceClient } from "./resource-client.js";
import type { ClientOptions, ResourceClient, VerikitClient } from "./types.js";

/** Builds a `VerikitClient` bound to `options.baseUrl`. */
export function createClient(options: ClientOptions): VerikitClient {
  // `sendRequest` calls this as `params.fetchImpl(...)`, a method-call whose
  // receiver is the `params` object, not `globalThis`. The global `fetch` is a
  // platform method that requires its receiver to be `globalThis`/`window` in
  // browsers, so an unbound reference throws "Illegal invocation" once called
  // this way. `.bind(globalThis)` fixes the receiver regardless of call site.
  const fetchImpl = options.fetch ?? fetch.bind(globalThis);

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
