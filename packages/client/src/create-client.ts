import { createResourceClient } from "./resource-client.js";
import type {
  ClientOptions,
  ResourceDefinition,
  VerikitClient,
} from "./types.js";

/** Builds a `VerikitClient` bound to `options.baseUrl`. */
export function createClient<
  TResources extends {
    [Name in keyof TResources]: ResourceDefinition;
  } = Record<string, ResourceDefinition>,
>(options: ClientOptions): VerikitClient<TResources> {
  // `fetchImpl` is invoked as an object method, so bind the global `fetch`
  // to preserve its required receiver in browsers.
  const fetchImpl = options.fetch ?? fetch.bind(globalThis);

  const cacheNamespace = options.cacheNamespace ?? crypto.randomUUID();

  const client: VerikitClient<Record<string, ResourceDefinition>> = {
    get cacheNamespace() {
      return cacheNamespace;
    },
    resource(
      name: string,
      resourceOptions: { path?: string } = {},
    ) {
      return createResourceClient({
        fetchImpl,
        baseUrl: options.baseUrl,
        headers: options.headers,
        name: resourceOptions.path ?? name,
      });
    },
  };

  return client as unknown as VerikitClient<TResources>;
}
