# @verikit/ui-core

Framework-neutral form, layout, and query logic for VeriKit UI bindings.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.

## Cache identity

Queries, mutations, and optimistic updates are isolated by client. Keep the client
stable during a session; replace it when the account, tenant, or access identity
changes. The provider resets descendant state on an identity change.

Manual cache access must use `resourceQueryKeys("posts", client)`; keys now include
the client's namespace. See [cache identity and migration](../client/README.md#cache-identity)
for explicit namespaces, SSR hydration, and logout handling.
