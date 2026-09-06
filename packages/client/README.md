# @verikit/client

Typed fetch client for VeriKit REST APIs.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.

## Custom resource paths

`client.resource(name)` uses `name` as the default route segment. If a server
resource is mounted with `createServer({ resources: [{ path: "..." }] })`, keep
the logical resource name and provide its route path explicitly:

```ts
client.resource("post", { path: "posts" });
```

## Cache identity

React and Vue queries are isolated by client identity, including when providers
share a TanStack `QueryClient`. Keep the client stable during a session. On login,
logout, account changes, tenant changes, or permission changes, create a new client
and pass it to `VerikitProvider`. The provider resets descendant state and queries
use the new namespace. In-flight mutations remain scoped to the old namespace.
Changing only the value returned by a headers callback does **not** change cache
identity. Token refreshes for the same identity may keep the existing client.

```ts
import { createClient } from "@verikit/client";

const client = createClient({ baseUrl: "/api", headers: getSessionHeaders });
// After an identity change, replace the provider's client:
const nextClient = createClient({
  baseUrl: "/api",
  headers: getNextSessionHeaders,
});
```

For intentional sharing or SSR hydration, supply `cacheNamespace` to
`createClient`. It must identify the API, account, tenant, and session/access
revision; never share it between different access identities. Use the same explicit
namespace on the server and browser when hydrating a cache. Keep server-side
`QueryClient` instances request-local. Do not put credentials in the namespace.

Manual cache access now requires the client (or its explicit namespace):

```ts
import { resourceQueryKeys } from "@verikit/ui-core";

const keys = resourceQueryKeys("posts", client);
queryClient.invalidateQueries({ queryKey: keys.all });
```

Keys now have the shape `["verikit", namespace, resourceName, ...]`. Migrate old
manual keys and discard persisted caches using the previous shape. Old namespaces
remain inaccessible to the new client's hooks and expire under TanStack Query's
normal garbage collection. Applications requiring immediate removal on logout
can cancel and remove queries under `["verikit", oldClient.cacheNamespace]`.
