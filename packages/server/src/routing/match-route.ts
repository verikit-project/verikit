/** Splits a URL pathname into non-empty segments. */
export function splitPath(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

/**
 * Returns the segments after `prefix`, or `undefined` if it isn't a prefix of `segments`.
 */
export function stripPrefix(
  segments: readonly string[],
  prefix: readonly string[],
): string[] | undefined {
  if (segments.length < prefix.length) {
    return undefined;
  }

  for (let index = 0; index < prefix.length; index += 1) {
    if (segments[index] !== prefix[index]) {
      return undefined;
    }
  }

  return segments.slice(prefix.length);
}

/**
 * A resolved action within one resource's route table, before permissions/validation run.
 */
export type RouteAction =
  | { kind: "list" }
  | { kind: "search" }
  | { kind: "create" }
  | { kind: "find"; id: string }
  | { kind: "update"; id: string }
  | { kind: "delete"; id: string }
  | { kind: "action"; name: string };

export type RouteResolution =
  | { status: "matched"; action: RouteAction }
  | { status: "method-not-allowed" }
  | { status: "not-found" };

/**
 * Matches the segments remaining after a resource's base path against the seven routes `createServer` exposes for that resource, given the request method. Distinguishes "no such shape" (404) from "right shape, wrong verb" (405) so the caller can respond accordingly.
 */
export function resolveResourceAction(
  remaining: readonly string[],
  method: string,
): RouteResolution {
  if (remaining.length === 0) {
    if (method === "GET") {
      return { status: "matched", action: { kind: "list" } };
    }

    if (method === "POST") {
      return { status: "matched", action: { kind: "create" } };
    }

    return { status: "method-not-allowed" };
  }

  // Only intercepts GET: a record literally named "search" must still be reachable via
  // PATCH/DELETE by falling through to the id branch below, the same way a record
  // named "actions" already falls through (that collision only checks a 2-segment shape, so it never intercepts here).
  if (remaining.length === 1 && remaining[0] === "search" && method === "GET") {
    return { status: "matched", action: { kind: "search" } };
  }

  if (remaining.length === 1) {
    const id = remaining[0] as string;

    if (method === "GET") {
      return { status: "matched", action: { kind: "find", id } };
    }

    if (method === "PATCH") {
      return { status: "matched", action: { kind: "update", id } };
    }

    if (method === "DELETE") {
      return { status: "matched", action: { kind: "delete", id } };
    }

    return { status: "method-not-allowed" };
  }

  if (remaining.length === 2 && remaining[0] === "actions") {
    return method === "POST"
      ? {
          status: "matched",
          action: { kind: "action", name: remaining[1] as string },
        }
      : { status: "method-not-allowed" };
  }

  return { status: "not-found" };
}
