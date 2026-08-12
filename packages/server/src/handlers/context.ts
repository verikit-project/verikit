import type { RouteTableEntry } from "../routing/route-table.js";

/**
 * Shared context passed to every route handler. The actor type is intentionally erased to `any`. Route handlers treat it as an opaque value that is only forwarded to permission checks and `runAction`. Preserving `TActor` here would make this type invariant due to its contravariant use in `ActionBuilder`, preventing generic server contexts from being assigned to handlers using the default actor type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate type erasure, see comment above
export interface HandlerContext<TActor = any> {
  entry: RouteTableEntry<TActor>;
  actor: TActor;
  request: Request;
  url: URL;
  maxBodyBytes: number | false;
}
