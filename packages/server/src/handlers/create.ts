import { parseJsonObjectBody } from "../http/parse-request.js";
import {
  dataResponse,
  errorResponse,
  forbiddenResponse,
} from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
  validateResourceInput,
} from "../permissions.js";
import type { HandlerContext } from "./context.js";

/** Handles `POST {base}`. */
export async function handleCreate(ctx: HandlerContext): Promise<Response> {
  const { entry, actor, request } = ctx;

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "create",
    { actor },
  );

  if (!permission.allowed) {
    return forbiddenResponse(permission.message);
  }

  const body = await parseJsonObjectBody(request);

  if (!body.ok) {
    return errorResponse(400, "Invalid JSON body.");
  }

  const validated = await validateResourceInput(
    entry.fields,
    body.value,
    entry.config.permissions,
    { actor },
  );

  if (!validated.success) {
    return errorResponse(400, "Validation failed.", {
      issues: validated.issues,
    });
  }

  const record = await entry.config.adapter.create(validated.value);
  const publicRecord = record as Record<string, unknown>;
  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    { actor, record: publicRecord },
  );

  return dataResponse(presentRecord(publicRecord, entry.fields, hidden), {
    status: 201,
  });
}
