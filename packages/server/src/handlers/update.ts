import { NotFoundError, ValidationError } from "@verikit/core";
import { requireJsonObjectBody } from "../http/parse-request.js";
import { dataResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
  validateResourceInput,
} from "../permissions.js";
import { UniqueConstraintError, uniqueConstraintIssues } from "../adapter.js";
import { validateRelationshipReferences } from "../relationship-validation.js";
import type { RouteTableEntry } from "../routing/route-table.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

/** Handles `PATCH {base}/:id`. */
export async function handleUpdate(
  ctx: HandlerContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors HandlerContext's own actor-type erasure, see its doc comment
  routeTable: readonly RouteTableEntry<any>[],
  id: string,
): Promise<Response> {
  const { entry, actor, request } = ctx;
  const scope = await resolveScope(entry, actor);
  const existing = (await entry.config.adapter.find(id, scope)) as
    Record<string, unknown> | undefined;

  if (!existing) {
    throw new NotFoundError();
  }

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "update",
    { actor, record: existing },
  );

// Return 404 for denied updates to avoid leaking record existence.
  if (!permission.allowed) {
    throw new NotFoundError();
  }

  const body = await requireJsonObjectBody(request, {
    maxBodyBytes: ctx.maxBodyBytes,
  });

// PATCH validates only submitted fields. Reapply server-owned scope fields
// to prevent updates from moving records outside their scope.
  const values = { ...body, ...(scope ?? {}) };
  const submittedFields = Object.fromEntries(
    Object.entries(entry.fields).filter(
      ([name]) => Object.hasOwn(body, name) || Object.hasOwn(scope ?? {}, name),
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
    throw new ValidationError("Validation failed.", validated.issues);
  }

  const clientFieldNames = new Set(
    Object.keys(body).filter((name) => !Object.hasOwn(scope ?? {}, name)),
  );
  const relationshipIssues = await validateRelationshipReferences(
    entry,
    routeTable,
    validated.value,
    clientFieldNames,
    actor,
  );

  if (relationshipIssues.length > 0) {
    throw new ValidationError("Validation failed.", relationshipIssues);
  }

  let record: Record<string, unknown> | undefined;
  try {
    record = await entry.config.adapter.update(id, validated.value, scope);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new ValidationError(
        "Validation failed.",
        uniqueConstraintIssues(error, entry.fields),
      );
    }
    throw error;
  }

// Handle records deleted between the permission check and update as not found.
  if (!record) {
    throw new NotFoundError();
  }

  const publicRecord = record as Record<string, unknown>;
  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    { actor, record: publicRecord },
  );

  return dataResponse(presentRecord(publicRecord, entry.fields, hidden));
}
