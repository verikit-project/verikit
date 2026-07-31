import {
  dataResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  redactFields,
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

  if (!permission.allowed) {
    return forbiddenResponse(permission.message);
  }

  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    {
      actor,
      record,
    },
  );

  return dataResponse(redactFields(record, hidden));
}
