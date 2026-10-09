import type { FieldSchema } from "@verikit/core";
import type {
  ServerActionHandler,
  ServerResourceConfig,
} from "../create-server.js";
import {
  resolveResourceAction,
  splitPath,
  stripPrefix,
  type RouteResolution,
} from "./match-route.js";

/** A registered resource's route base, pre-computed field schemas, and executable actions. */
export interface RouteTableEntry<TActor = unknown> {
  config: ServerResourceConfig<TActor>;
  baseSegments: string[];
  fields: Record<string, FieldSchema>;
  /** Actions exposed as `POST {base}/actions/:name`: `handlers` plus deprecated `actions`. */
  actions: ServerActionHandler<TActor>[];
}

// Configs already warned about, so `createServer()` and `generateOpenApi()` over
// the same resources warn once rather than per call.
const warnedLegacyActions = new WeakSet<object>();

function warnLegacyActions(config: ServerResourceConfig<never>): void {
  if (warnedLegacyActions.has(config)) {
    return;
  }
  warnedLegacyActions.add(config);
  console.warn(
    `[verikit] Resource "${config.resource.name}": \`actions\` in createServer() is deprecated and will be removed in the next minor release. ` +
      "Declare actions on the resource with defineResource({ actions }) and pass server handlers built from those declarations via `handlers` (e.g. `handlers: [publish.execute(fn)]`).",
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested: unknown) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(
          Object.entries(nested).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : nested,
  );
}

/**
 * Resolves a resource's executable actions. Every `handlers` entry must match an action declared on the resource and serialize identically to it, so the client renders the same form, confirmation, and labels the server enforces. Declared actions without a handler get no route.
 */
function resolveActions<TActor>(
  config: ServerResourceConfig<TActor>,
): ServerActionHandler<TActor>[] {
  const resourceName = config.resource.name;
  const declared = new Map(
    config.resource.actions.map((declaration) => [
      declaration.name,
      declaration,
    ]),
  );
  const resolved: ServerActionHandler<TActor>[] = [];
  const names = new Set<string>();

  const add = (handler: ServerActionHandler<TActor>) => {
    if (names.has(handler.name)) {
      throw new Error(
        `Resource "${resourceName}" has duplicate action "${handler.name}".`,
      );
    }
    names.add(handler.name);
    resolved.push(handler);
  };

  for (const handler of config.handlers ?? []) {
    const declaration = declared.get(handler.name);

    if (!declaration) {
      throw new Error(
        `Resource "${resourceName}" has a handler for undeclared action "${handler.name}". Declare it with defineResource({ actions }).`,
      );
    }

    if (!handler.getRuntime().handler) {
      throw new Error(
        `Resource "${resourceName}" handler for action "${handler.name}" has no .execute() function.`,
      );
    }

    if (stableJson(handler.toSchema()) !== stableJson(declaration.toSchema())) {
      throw new Error(
        `Resource "${resourceName}" handler for action "${handler.name}" does not match its declaration. Build the handler from the declared action (e.g. \`${handler.name}.execute(fn)\`) instead of redefining its label, form, or confirmation.`,
      );
    }

    add(handler);
  }

  if (config.actions) {
    warnLegacyActions(config as ServerResourceConfig<never>);

    for (const legacy of config.actions) {
      add(legacy);
    }
  }

  return resolved;
}

function resourcePath(
  config: Pick<ServerResourceConfig, "path" | "resource">,
): string {
  return config.path ?? config.resource.name;
}

/**
 * Builds the per-resource route table once at `createServer()` time, sorted by base-segment length (longest first) so a nested custom `path` is tried before a shorter one that would otherwise swallow its prefix. Also finalizes each resource's field schemas once, since they never change per request. @throws {Error} If two resources resolve to the same base route, a resource registers two actions with the same name, or a `handlers` entry is undeclared, lacks `.execute()`, or diverges from its declaration.
 */
export function buildRouteTable<TActor>(
  resources: readonly ServerResourceConfig<TActor>[],
  basePath: string,
): RouteTableEntry<TActor>[] {
  const basePrefix = splitPath(basePath);
  const seenRoutes = new Set<string>();

  const entries = resources.map((config) => {
    const baseSegments = [...basePrefix, ...splitPath(resourcePath(config))];
    const routeKey = baseSegments.join("/");

    if (seenRoutes.has(routeKey)) {
      throw new Error(`Duplicate resource route "/${routeKey}".`);
    }
    seenRoutes.add(routeKey);

    return {
      config,
      baseSegments,
      fields: config.resource.toSchema().fields,
      actions: resolveActions(config),
    };
  });

  return entries.sort((a, b) => b.baseSegments.length - a.baseSegments.length);
}

export interface ResolvedRoute<TActor = unknown> {
  entry: RouteTableEntry<TActor>;
  resolution: RouteResolution;
}

/**
 * Finds the resource whose base path prefixes `pathname` (tried longest-base first) and resolves the action within it. Returns `undefined` if no resource's base matches at all.
 */
export function resolveRoute<TActor>(
  table: readonly RouteTableEntry<TActor>[],
  pathname: string,
  method: string,
): ResolvedRoute<TActor> | undefined {
  const segments = splitPath(pathname);

  for (const entry of table) {
    const remaining = stripPrefix(segments, entry.baseSegments);

    if (remaining !== undefined) {
      return { entry, resolution: resolveResourceAction(remaining, method) };
    }
  }

  return undefined;
}
