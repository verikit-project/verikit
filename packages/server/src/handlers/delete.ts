import { noContentResponse, notFoundResponse } from "../http/responses.js";
import { maybeCheckResourceOperation } from "../permissions.js";
import type { HandlerContext } from "./context.js";

/** Handles `DELETE {base}/:id`. */
export async function handleDelete(
  ctx: HandlerContext,
  id: string,
): Promise<Response> {
  const { entry, actor } = ctx;
  const existing = (await entry.config.adapter.find(id)) as
    Record<string, unknown> | undefined;

  if (!existing) {
    return notFoundResponse();
  }

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "delete",
    { actor, record: existing },
  );

  // A denied actor gets the same 404 as a missing record: returning 403 here
  // would let them distinguish "doesn't exist" from "exists but I can't
  // delete it" (an existence oracle) for a record we've already confirmed is
  // real.
  if (!permission.allowed) {
    return notFoundResponse();
  }

  await entry.config.adapter.delete(id);
  return noContentResponse();
}
