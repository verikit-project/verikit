import { notFoundResponse } from "../http/responses.js";
import type { RouteTableEntry } from "../routing/route-table.js";
import type { HandlerContext } from "./context.js";
import { handleList } from "./list.js";

/**
 * Lists selectable records for a `belongsTo` relationship using the target
 * resource's standard list behavior, including permissions and scopes.
 */
export async function handleRelationshipPicker<TActor>(
  ctx: HandlerContext<TActor>,
  table: readonly RouteTableEntry<TActor>[],
  relationshipName: string,
): Promise<Response> {
  const relationship =
    ctx.entry.config.resource.relationships[relationshipName];

  const schema = relationship?.toSchema(relationshipName);

  if (!schema || schema.relationshipType !== "belongsTo") {
    return notFoundResponse();
  }

  const target = table.find(
    (entry) => entry.config.resource.name === schema.resource,
  );

  if (!target) {
    return notFoundResponse();
  }

  return handleList({ ...ctx, entry: target });
}
