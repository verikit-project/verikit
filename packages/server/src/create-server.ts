import type { PermissionsBuilder, Resource } from "@verikit/core";
import type { ActionBuilder } from "@verikit/runtime";
import type { ResourceAdapter } from "./adapter.js";
import { handleAction } from "./handlers/action.js";
import { handleCreate } from "./handlers/create.js";
import { handleDelete } from "./handlers/delete.js";
import { handleFind } from "./handlers/find.js";
import { handleList } from "./handlers/list.js";
import { handleUpdate } from "./handlers/update.js";
import { handleUpload } from "./handlers/upload.js";
import type { FileStorage } from "./storage.js";
import {
  errorResponse,
  methodNotAllowedResponse,
  notFoundResponse,
} from "./http/responses.js";
import { DEFAULT_MAX_BODY_BYTES } from "./http/parse-request.js";
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
  /** Backend used by `POST /{resource}/uploads/{fileField}`. */
  storage?: FileStorage;
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
  /**
   * Maximum JSON request body size, in bytes, for create/update/action routes.
   * Defaults to 1 MiB. Pass `false` to disable this package-level guard when an
   * upstream framework/platform already enforces the limit you want.
   */
  maxBodyBytes?: number | false;
  /**
   * Optional CORS handling for browser clients. Omit to leave CORS entirely to
   * the framework/deployment layer. When configured, matching preflight
   * `OPTIONS` requests return 204 and matching normal responses receive CORS
   * headers.
   */
  cors?: CorsOptions;
}

const DEFAULT_SEARCH_PAGE_SIZE = 10;

export interface CorsOptions {
  /**
   * Allowed request origins. Pass `"*"` for public, non-credentialed APIs; a
   * string/array for fixed origins; or a predicate for dynamic policy.
   */
  origin:
    | "*"
    | string
    | readonly string[]
    | ((origin: string, request: Request) => boolean);
  /** Whether browser credentials are allowed. Defaults to false. */
  credentials?: boolean;
  /** Methods advertised in preflight responses. Defaults to Verikit's routes. */
  methods?: readonly string[];
  /** Request headers advertised in preflight responses. Defaults to the request's requested headers. */
  allowedHeaders?: readonly string[];
  /** Headers browser clients may read from normal responses. */
  exposedHeaders?: readonly string[];
  /** Access-Control-Max-Age, in seconds. */
  maxAge?: number;
}

interface ResolvedCors {
  origin: Exclude<CorsOptions["origin"], readonly string[]> | Set<string>;
  credentials: boolean;
  methods: string;
  allowedHeaders?: string;
  exposedHeaders?: string;
  maxAge?: string;
}

const DEFAULT_CORS_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"];

function normalizeMaxBodyBytes(
  value: number | false | undefined,
): number | false {
  if (value === undefined) {
    return DEFAULT_MAX_BODY_BYTES;
  }

  if (value === false) {
    return false;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("maxBodyBytes must be a positive integer, or false.");
  }

  return value;
}

function joinHeaderValues(values: readonly string[]): string {
  return values.join(", ");
}

function isOriginList(
  value: CorsOptions["origin"],
): value is readonly string[] {
  return Array.isArray(value);
}

function normalizeCors(
  cors: CorsOptions | undefined,
): ResolvedCors | undefined {
  if (!cors) {
    return undefined;
  }

  if (cors.origin === "*" && cors.credentials === true) {
    throw new Error('cors.credentials cannot be true when cors.origin is "*".');
  }

  if (
    cors.maxAge !== undefined &&
    (!Number.isInteger(cors.maxAge) || cors.maxAge < 0)
  ) {
    throw new Error("cors.maxAge must be a non-negative integer.");
  }

  const origin = isOriginList(cors.origin)
    ? new Set<string>(cors.origin)
    : cors.origin;

  return {
    origin,
    credentials: cors.credentials ?? false,
    methods: joinHeaderValues(cors.methods ?? DEFAULT_CORS_METHODS),
    allowedHeaders: cors.allowedHeaders
      ? joinHeaderValues(cors.allowedHeaders)
      : undefined,
    exposedHeaders: cors.exposedHeaders
      ? joinHeaderValues(cors.exposedHeaders)
      : undefined,
    maxAge: cors.maxAge === undefined ? undefined : String(cors.maxAge),
  };
}

function allowedOrigin(
  cors: ResolvedCors,
  origin: string,
  request: Request,
): string | undefined {
  if (cors.origin === "*") {
    return "*";
  }

  if (typeof cors.origin === "string") {
    return cors.origin === origin ? origin : undefined;
  }

  if (typeof cors.origin === "function") {
    return cors.origin(origin, request) ? origin : undefined;
  }

  return cors.origin.has(origin) ? origin : undefined;
}

function corsHeaders(
  cors: ResolvedCors | undefined,
  request: Request,
): Headers | undefined {
  if (!cors) {
    return undefined;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return undefined;
  }

  const allowed = allowedOrigin(cors, origin, request);

  if (!allowed) {
    return undefined;
  }

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", allowed);

  if (allowed !== "*") {
    headers.set("Vary", "Origin");
  }

  if (cors.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  if (cors.exposedHeaders) {
    headers.set("Access-Control-Expose-Headers", cors.exposedHeaders);
  }

  return headers;
}

function withCors(response: Response, headers: Headers | undefined): Response {
  if (!headers) {
    return response;
  }

  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

function preflightResponse(
  cors: ResolvedCors,
  request: Request,
): Response | undefined {
  if (request.method !== "OPTIONS") {
    return undefined;
  }

  const headers = corsHeaders(cors, request);

  if (!headers) {
    return undefined;
  }

  headers.set("Access-Control-Allow-Methods", cors.methods);
  headers.set(
    "Access-Control-Allow-Headers",
    cors.allowedHeaders ??
      request.headers.get("access-control-request-headers") ??
      "Content-Type",
  );

  if (cors.maxAge) {
    headers.set("Access-Control-Max-Age", cors.maxAge);
  }

  return new Response(null, { status: 204, headers });
}

/**
 * Derives a web-standard `(Request) => Promise<Response>` handler from a set of resources: CRUD, a search alias, and named-action routes, each wired through `@verikit/core` permissions/validation and `@verikit/runtime`'s `runAction`. Storage is never touched directly every operation goes through the resource's `ResourceAdapter`. @throws {Error} If two resources resolve to the same route, or a resource declares two actions with the same name checked once, at creation time.
 */
export function createServer<TActor = unknown>(
  options: CreateServerOptions<TActor>,
): (request: Request) => Promise<Response> {
  const routeTable = buildRouteTable(options.resources, options.basePath ?? "");
  const maxBodyBytes = normalizeMaxBodyBytes(options.maxBodyBytes);
  const cors = normalizeCors(options.cors);

  return async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const routeMethod =
      request.method === "OPTIONS" && cors
        ? (request.headers.get("access-control-request-method") ?? "GET")
        : request.method;
    const resolved = resolveRoute(routeTable, url.pathname, routeMethod);
    const responseCorsHeaders = corsHeaders(cors, request);

    if (!resolved) {
      return withCors(notFoundResponse(), responseCorsHeaders);
    }

    if (resolved.resolution.status === "not-found") {
      return withCors(notFoundResponse(), responseCorsHeaders);
    }

    if (resolved.resolution.status === "method-not-allowed") {
      return withCors(methodNotAllowedResponse(), responseCorsHeaders);
    }

    const preflight = cors ? preflightResponse(cors, request) : undefined;

    if (preflight) {
      return preflight;
    }

    if (request.method === "OPTIONS") {
      return withCors(methodNotAllowedResponse(), responseCorsHeaders);
    }

    const { action } = resolved.resolution;

    try {
      const actor = (await options.context?.(request)) as TActor;
      const ctx = { entry: resolved.entry, actor, request, url, maxBodyBytes };

      switch (action.kind) {
        case "list":
          return withCors(await handleList(ctx), responseCorsHeaders);
        case "search":
          return withCors(
            await handleList(ctx, {
              defaultPageSize: DEFAULT_SEARCH_PAGE_SIZE,
            }),
            responseCorsHeaders,
          );
        case "create":
          return withCors(await handleCreate(ctx), responseCorsHeaders);
        case "find":
          return withCors(
            await handleFind(ctx, action.id),
            responseCorsHeaders,
          );
        case "update":
          return withCors(
            await handleUpdate(ctx, action.id),
            responseCorsHeaders,
          );
        case "delete":
          return withCors(
            await handleDelete(ctx, action.id),
            responseCorsHeaders,
          );
        case "action":
          return withCors(
            await handleAction(ctx, action.name),
            responseCorsHeaders,
          );
        case "upload":
          return withCors(
            await handleUpload(ctx, action.field, options.storage),
            responseCorsHeaders,
          );
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
      return withCors(
        errorResponse(500, "Internal server error."),
        responseCorsHeaders,
      );
    }
  };
}
