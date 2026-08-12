import { parseJsonObjectBody } from "../http/parse-request.js";
import {
  dataResponse,
  errorResponse,
  notFoundResponse,
} from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
  validateResourceInput,
} from "../permissions.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

/** Handles `PATCH {base}/:id`. */
export async function handleUpdate(
  ctx: HandlerContext,
  id: string,
): Promise<Response> {
  const { entry, actor, request } = ctx;
  const scope = await resolveScope(entry, actor);
  const existing = (await entry.config.adapter.find(id, scope)) as
    Record<string, unknown> | undefined;

  if (!existing) {
    return notFoundResponse();
  }

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "update",
    { actor, record: existing },
  );

  // A denied actor gets the same 404 as a missing record: returning 403 here would let
  // them distinguish "doesn't exist" from "exists but I can't update it" (an existence
  // oracle) for a record we've already confirmed is real.
  if (!permission.allowed) {
    return notFoundResponse();
  }

  const body = await parseJsonObjectBody(request, {
    maxBodyBytes: ctx.maxBodyBytes,
  });

  if (!body.ok) {
    return body.reason === "too-large"
      ? errorResponse(413, "Payload too large.")
      : errorResponse(400, "Invalid JSON body.");
  }

  // PATCH is partial: only validate fields actually present in the body, so a
  // `required()`/`default()` field already set on the record doesn't force every
  // unrelated update to resupply it (core's `shouldValidateField` checks required/default fields unconditionally, which is right for `create`'s full payload but wrong for a partial `update`).
  // Scope fields are server-owned on updates too. Reasserting them prevents a
  // tenant from moving a record outside its scope with a PATCH request.
  const values = { ...body.value, ...(scope ?? {}) };
  const submittedFields = Object.fromEntries(
    Object.entries(entry.fields).filter(
      ([name]) =>
        Object.hasOwn(body.value, name) || Object.hasOwn(scope ?? {}, name),
    ),
  );

  const validated = await validateResourceInput(
    submittedFields,
    values,
    entry.config.permissions,
    { actor, record: existing },
    scope,
  );

  if (!validated.success) {
    return errorResponse(400, "Validation failed.", {
      issues: validated.issues,
    });
  }

  const record = await entry.config.adapter.update(id, validated.value, scope);

  // The record existed and was permission-checked above, but that check and the update
  // itself aren't atomic: a concurrent delete can still land in between, which the
  // adapter reports the same way `find` reports "missing": `undefined`, not a thrown error.
  if (!record) {
    return notFoundResponse();
  }

  const publicRecord = record as Record<string, unknown>;
  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    { actor, record: publicRecord },
  );

  return dataResponse(presentRecord(publicRecord, entry.fields, hidden));
}
