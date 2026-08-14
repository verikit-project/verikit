import { NotFoundError } from "@verikit/core";
import { noContentResponse } from "../http/responses.js";
import { maybeCheckResourceOperation } from "../permissions.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

/** Handles `DELETE {base}/:id`. */
export async function handleDelete(
  ctx: HandlerContext,
  id: string,
): Promise<Response> {
  const { entry, actor } = ctx;
  const scope = await resolveScope(entry, actor);
  const existing = (await entry.config.adapter.find(id, scope)) as
    Record<string, unknown> | undefined;

  if (!existing) {
    throw new NotFoundError();
  }

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "delete",
    { actor, record: existing },
  );

// Return 404 for denied deletes to avoid leaking record existence.
  if (!permission.allowed) {
    throw new NotFoundError();
  }

  await entry.config.adapter.delete(id, scope);
  return noContentResponse();
}
