import { NotFoundError } from "@verikit/core";
import { dataResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
} from "../permissions.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

/** Handles `GET {base}/:id`. */
export async function handleFind(
  ctx: HandlerContext,
  id: string,
): Promise<Response> {
  const { entry, actor } = ctx;
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

  return dataResponse(presentRecord(record, entry.fields, hidden));
}
