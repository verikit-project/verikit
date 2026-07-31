import { parseJsonObjectBody } from "../http/parse-request.js";
import {
  dataResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  validateResourceInput,
} from "../permissions.js";
import type { HandlerContext } from "./context.js";

/** Handles `PATCH {base}/:id`. */
export async function handleUpdate(
  ctx: HandlerContext,
  id: string,
): Promise<Response> {
  const { entry, actor, request } = ctx;
  const existing = (await entry.config.adapter.find(id)) as
    Record<string, unknown> | undefined;

  if (!existing) {
    return notFoundResponse();
  }

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "update",
    { actor, record: existing },
  );

  if (!permission.allowed) {
    return forbiddenResponse(permission.message);
  }

  const body = await parseJsonObjectBody(request);

  if (!body.ok) {
    return errorResponse(400, "Invalid JSON body.");
  }

  // PATCH is partial: only validate fields actually present in the body, so
  // a `required()`/`default()` field already set on the record doesn't force
  // every unrelated update to resupply it (core's `shouldValidateField`
  // checks required/default fields unconditionally, which is right for
  // `create`'s full payload but wrong for a partial `update`).
  const submittedFields = Object.fromEntries(
    Object.entries(entry.fields).filter(([name]) =>
      Object.hasOwn(body.value, name),
    ),
  );

  const validated = await validateResourceInput(
    submittedFields,
    body.value,
    entry.config.permissions,
    { actor, record: existing },
  );

  if (!validated.success) {
    return errorResponse(400, "Validation failed.", {
      issues: validated.issues,
    });
  }

  const record = await entry.config.adapter.update(id, validated.value);
  return dataResponse(record);
}
