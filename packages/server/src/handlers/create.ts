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
import { UniqueConstraintError, uniqueConstraintIssues } from "../adapter.js";
import type { HandlerContext } from "./context.js";
import { resolveCreateValues } from "../access.js";

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

  const body = await parseJsonObjectBody(request, {
    maxBodyBytes: ctx.maxBodyBytes,
  });

  if (!body.ok) {
    return body.reason === "too-large"
      ? errorResponse(413, "Payload too large.")
      : errorResponse(400, "Invalid JSON body.");
  }

  // Resolve before validation so required tenant fields can be server-owned, and
  // merge last so a submitted organizationId can never override the actor's one.
  const owned = (await resolveCreateValues(entry, actor)) ?? {};
  const values = { ...body.value, ...owned };

  const validated = await validateResourceInput(
    entry.fields,
    values,
    entry.config.permissions,
    { actor },
    owned,
  );

  if (!validated.success) {
    return errorResponse(400, "Validation failed.", {
      issues: validated.issues,
    });
  }

  // Access-owned values intentionally win over the request body: a client can never
  // select a different organization simply by submitting its organizationId.
  let record: unknown;
  try {
    record = await entry.config.adapter.create(validated.value);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return errorResponse(400, "Validation failed.", {
        issues: uniqueConstraintIssues(error, entry.fields),
      });
    }
    throw error;
  }
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
