import type { FieldSchema } from "@verikit/core";
import type { ServerResourceConfig } from "../create-server.js";
import {
  resolveResourceAction,
  splitPath,
  stripPrefix,
  type RouteResolution,
} from "./match-route.js";

/** A registered resource's route base and pre-computed field schemas. */
export interface RouteTableEntry<TActor = unknown> {
  config: ServerResourceConfig<TActor>;
  baseSegments: string[];
  fields: Record<string, FieldSchema>;
}

function resourcePath(
  config: Pick<ServerResourceConfig, "path" | "resource">,
): string {
  return config.path ?? config.resource.name;
}

/**
 * Builds the per-resource route table once at `createServer()` time, sorted by base-segment length (longest first) so a nested custom `path` is tried before a shorter one that would otherwise swallow its prefix. Also finalizes each resource's field schemas once, since they never change per request. @throws {Error} If two resources resolve to the same base route, or a resource declares two actions with the same name.
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

    const actionNames = new Set<string>();
    for (const action of config.actions ?? []) {
      if (actionNames.has(action.name)) {
        throw new Error(
          `Resource "${config.resource.name}" has duplicate action "${action.name}".`,
        );
      }
      actionNames.add(action.name);
    }

    return {
      config,
      baseSegments,
      fields: config.resource.toSchema().fields,
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
