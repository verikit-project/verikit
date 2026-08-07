import { dataResponse, notFoundResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
} from "../permissions.js";
import type { HandlerContext } from "./context.js";

/** Handles `GET {base}/:id`. */
export async function handleFind(
  ctx: HandlerContext,
  id: string,
): Promise<Response> {
  const { entry, actor } = ctx;
  const record = (await entry.config.adapter.find(id)) as
    Record<string, unknown> | undefined;

  if (!record) {
    return notFoundResponse();
  }

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "read",
    { actor, record },
  );

  // A denied actor gets the same 404 as a missing record: returning 403 here
  // would let them distinguish "doesn't exist" from "exists but I can't read
  // it" (an existence oracle) for a record we've already confirmed is real.
  if (!permission.allowed) {
    return notFoundResponse();
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
