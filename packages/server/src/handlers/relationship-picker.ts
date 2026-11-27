import { NotFoundError } from "@verikit/core";
import type { RouteTableEntry } from "../routing/route-table.js";
import type { HandlerContext } from "./context.js";
import { handleList } from "./list.js";

/**
 * Lists selectable records for a `belongsTo` relationship using the target
 * resource's standard list behavior, including permissions and scopes.
 * Search also covers the relationship's `displayField`, so a picker can be
 * searched by the label it shows even when that field isn't `.searchable()`.
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
    throw new NotFoundError();
  }

  const target = table.find(
    (entry) => entry.config.resource.name === schema.resource,
  );

  if (!target) {
    throw new NotFoundError();
  }

  // Pickers only select records, so they never report actions or labels.
  return handleList(
    { ...ctx, entry: target },
    {
      includes: false,
      ...(schema.displayField && { extraSearchFields: [schema.displayField] }),
    },
  );
}
