import { parseJsonObjectBody } from "../http/parse-request.js";
import {
  dataResponse,
  errorResponse,
  forbiddenResponse,
} from "../http/responses.js";
import {
  maybeCheckResourceOperation,
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
  return dataResponse(record, { status: 201 });
}
