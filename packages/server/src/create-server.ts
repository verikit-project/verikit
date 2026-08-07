import type { PermissionsBuilder, Resource } from "@verikit/core";
import type { ActionBuilder } from "@verikit/runtime";
import type { ResourceAdapter } from "./adapter.js";
import { handleAction } from "./handlers/action.js";
import { handleCreate } from "./handlers/create.js";
import { handleDelete } from "./handlers/delete.js";
import { handleFind } from "./handlers/find.js";
import { handleList } from "./handlers/list.js";
import { handleUpdate } from "./handlers/update.js";
import {
  errorResponse,
  methodNotAllowedResponse,
  notFoundResponse,
} from "./http/responses.js";
import { buildRouteTable, resolveRoute } from "./routing/route-table.js";
import type { RouteAction } from "./routing/match-route.js";

/** The resource and action a request resolved to, passed to `onError` for diagnostics. */
export interface ServerErrorRoute {
  resource: string;
  action: RouteAction;
}

/** One resource registered with `createServer()`. */
export interface ServerResourceConfig<TActor = unknown> {
  resource: Resource;
  adapter: ResourceAdapter;
  /**
   * Route segment this resource is mounted at; defaults to `resource.name` verbatim (no auto-pluralization).
   */
  path?: string;
  /**
   * Named runtime actions (`@verikit/runtime`'s `action(...)`) exposed as `POST {base}/actions/:name`. Form/record/result type params are erased here since actions of differing shapes share one array; `runAction` recovers them per-action when the server invokes it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate type erasure, see comment above
  actions?: ActionBuilder<string, any, TActor, any, any>[];
  /**
   * Resource-level CRUD/field/action gate. Required so a resource can never end up unguarded
   * by accident  pass a real `PermissionsBuilder`, or the literal `"open"` to explicitly opt this
   * resource out of permission checks entirely (see `maybeCheckResourceOperation`). `"open"` is
   * loud and greppable on purpose: `grep -rn 'permissions: "open"'` finds every intentionally
   * unguarded resource in a codebase.
   */
  permissions: PermissionsBuilder<TActor, unknown> | "open";
}

export interface CreateServerOptions<TActor = unknown> {
  resources: ServerResourceConfig<TActor>[];
  /**
   * Derives the actor used for permission checks from the incoming request.
   */
  context?: (request: Request) => TActor | Promise<TActor>;
  /**
   * Prefix every resource is mounted under, e.g. `"/api"`. Defaults to `""`.
   */
  basePath?: string;
  /**
   * Called whenever a handler or adapter throws, right before the generic 500 envelope is
   * returned to the client the response body never includes `error`'s details (it may carry
   * storage internals a client shouldn't see), so this is the only way to observe what actually
   * failed. Errors thrown by `onError` itself are caught and ignored, so a broken logger can't
   * turn a handled failure into an unhandled rejection see `runAction`'s `error` hook in
   * `@verikit/runtime` for the same convention.
   */
  onError?: (error: unknown, request: Request, route: ServerErrorRoute) => void;
}

const DEFAULT_SEARCH_PAGE_SIZE = 10;

/**
 * Derives a web-standard `(Request) => Promise<Response>` handler from a set of resources: CRUD, a search alias, and named-action routes, each wired through `@verikit/core` permissions/validation and `@verikit/runtime`'s `runAction`. Storage is never touched directly every operation goes through the resource's `ResourceAdapter`. @throws {Error} If two resources resolve to the same route, or a resource declares two actions with the same name checked once, at creation time.
 */
export function createServer<TActor = unknown>(
  options: CreateServerOptions<TActor>,
): (request: Request) => Promise<Response> {
  const routeTable = buildRouteTable(options.resources, options.basePath ?? "");

  return async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const resolved = resolveRoute(routeTable, url.pathname, request.method);

    if (!resolved) {
      return notFoundResponse();
    }

    if (resolved.resolution.status === "not-found") {
      return notFoundResponse();
    }

    if (resolved.resolution.status === "method-not-allowed") {
      return methodNotAllowedResponse();
    }

    const { action } = resolved.resolution;

    try {
      const actor = (await options.context?.(request)) as TActor;
      const ctx = { entry: resolved.entry, actor, request, url };

      switch (action.kind) {
        case "list":
          return await handleList(ctx);
        case "search":
          return await handleList(ctx, {
            defaultPageSize: DEFAULT_SEARCH_PAGE_SIZE,
          });
        case "create":
          return await handleCreate(ctx);
        case "find":
          return await handleFind(ctx, action.id);
        case "update":
          return await handleUpdate(ctx, action.id);
        case "delete":
          return await handleDelete(ctx, action.id);
        case "action":
          return await handleAction(ctx, action.name);
      }
    } catch (error) {
      // Adapter (or other handler) exceptions shouldn't surface as an unhandled rejection
      // or a raw error to the caller map them to the package's own JSON error envelope.
      // The underlying error is intentionally not included in the response; it may carry storage internals a client shouldn't see.
      try {
        options.onError?.(error, request, {
          resource: resolved.entry.config.resource.name,
          action,
        });
      } catch {
        // Ignore errors from onError so a broken logger doesn't mask the original failure.
      }
      return errorResponse(500, "Internal server error.");
    }
  };
}
