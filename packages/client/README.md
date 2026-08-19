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
