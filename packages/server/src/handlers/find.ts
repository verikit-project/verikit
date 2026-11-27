import { NotFoundError } from "@verikit/core";
import { dataResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
} from "../permissions.js";
import { relationshipLabels } from "../relationship-labels.js";
import type { RouteTableEntry } from "../routing/route-table.js";
import {
  parseIncludes,
  recordActionAvailability,
  recordOperationAvailability,
} from "./action-availability.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

/**
 * Handles `GET {base}/:id`. With `include=actions`, also reports which record-scoped actions the actor can't run on the record as `meta.actions`, and which built-in operations (`update`, `delete`) as `meta.operations`. With `include=relationships`, also reports its `belongsTo` display labels as `meta.relationships`, looked up in `table`.
 */
export async function handleFind(
  ctx: HandlerContext,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- actor erased, as in `HandlerContext`
  table: readonly RouteTableEntry<any>[] = [],
): Promise<Response> {
  const { entry, actor, url } = ctx;
  const includes = parseIncludes(url);
  const scope = await resolveScope(entry, actor);
  const record = (await entry.config.adapter.find(id, scope)) as
    Record<string, unknown> | undefined;

  if (!record) {
    throw new NotFoundError();
  }

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "read",
    { actor, record },
  );

  // Return 404 for denied reads to avoid leaking record existence.
  if (!permission.allowed) {
    throw new NotFoundError();
  }

  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    {
      actor,
      record,
    },
  );

  const presented = presentRecord(record, entry.fields, hidden);
  const [actionMeta, relationships] = await Promise.all([
    includes.has("actions")
      ? Promise.all([
          recordActionAvailability(ctx, record),
          recordOperationAvailability(ctx, record),
        ]).then(([actions, operations]) => ({ actions, operations }))
      : undefined,
    includes.has("relationships")
      ? relationshipLabels(entry, table, [presented], actor)
      : undefined,
  ]);
  const meta =
    actionMeta || relationships
      ? { ...actionMeta, ...(relationships && { relationships }) }
      : undefined;

  return dataResponse(presented, {
    ...(meta && { meta }),
  });
}
