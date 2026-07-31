import {
  forbiddenResponse,
  noContentResponse,
  notFoundResponse,
} from "../http/responses.js";
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

  if (!permission.allowed) {
    return forbiddenResponse(permission.message);
  }

  await entry.config.adapter.delete(id);
  return noContentResponse();
}
