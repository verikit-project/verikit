import { notFoundResponse } from "../http/responses.js";
import type { RouteTableEntry } from "../routing/route-table.js";
import type { HandlerContext } from "./context.js";
import { handleList } from "./list.js";

/**
 * Lists records that may be selected for a `belongsTo` relationship.
 *
 * The picker deliberately delegates to the target resource's ordinary list
 * handler. That keeps target access checks, actor-aware scopes, field
 * redaction, filters, sorting, and search behaviour identical to a direct
 * target-resource request. `hasMany` and `belongsToMany` are not pickers: they
 * describe already-related collections and require a parent record or an
 * explicit join-resource contract respectively.
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
