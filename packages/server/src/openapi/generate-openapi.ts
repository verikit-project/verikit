import type { JsonSchemaValue } from "@verikit/core";
import type { CreateServerOptions } from "../create-server.js";
import { splitPath } from "../routing/match-route.js";
import { buildRouteTable } from "../routing/route-table.js";
import { errorComponentSchemas } from "./error-schemas.js";
import type { OpenApiDocument, OpenApiInfo, PathItemObject } from "./openapi-types.js";
import { resourceComponentSchemas } from "./resource-schemas.js";
import { resourcePaths } from "./resource-paths.js";

/**
 * Generates an OpenAPI 3.1 document describing the REST API exposed by
 * `createServer()` for the same options.
 *
 * Reuses `buildRouteTable()` so documented routes stay aligned with the
 * routes registered by the server.
 */
export function generateOpenApiDocument<TActor = unknown>(
  options: CreateServerOptions<TActor>,
  info: OpenApiInfo,
): OpenApiDocument {
  const basePath = options.basePath ?? "";
  const routeTable = buildRouteTable(options.resources, basePath);
  const basePrefixLength = splitPath(basePath).length;

  const entriesByResourceName = new Map(
    routeTable.map((entry) => [entry.config.resource.name, entry] as const),
  );

  const schemas: Record<string, JsonSchemaValue> = errorComponentSchemas();
  const paths: Record<string, PathItemObject> = {};

  for (const entry of routeTable) {
    Object.assign(schemas, resourceComponentSchemas(entry));

    const resourceBase =
      "/" + entry.baseSegments.slice(basePrefixLength).join("/");

    Object.assign(
      paths,
      resourcePaths(entry, resourceBase, {
        hasStorage: options.storage !== undefined,
        entriesByResourceName,
      }),
    );
  }

  return {
    openapi: "3.1.0",
    info,
    ...(basePath.length > 0 && { servers: [{ url: basePath }] }),
    paths,
    components: { schemas },
  };
}
