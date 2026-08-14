import { ForbiddenError, ValidationError } from "@verikit/core";
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
import { resolveCreateValues } from "../access.js";

/** Handles `POST {base}`. */
export async function handleCreate(
  ctx: HandlerContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors HandlerContext's own actor-type erasure, see its doc comment
  routeTable: readonly RouteTableEntry<any>[],
): Promise<Response> {
  const { entry, actor, request } = ctx;

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "create",
    { actor },
  );

  if (!permission.allowed) {
    throw new ForbiddenError(permission.message);
  }

  const body = await requireJsonObjectBody(request, {
    maxBodyBytes: ctx.maxBodyBytes,
  });

  // Resolve before validation so required tenant fields can be server-owned, and
  // merge last so a submitted organizationId can never override the actor's one.
  const owned = (await resolveCreateValues(entry, actor)) ?? {};
  const values = { ...body, ...owned };

  const validated = await validateResourceInput(
    entry.fields,
    values,
    entry.config.permissions,
    { actor },
    owned,
  );

  if (!validated.success) {
    throw new ValidationError("Validation failed.", validated.issues);
  }

  const clientFieldNames = new Set(
    Object.keys(body).filter((name) => !Object.hasOwn(owned, name)),
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

  // Access-owned values intentionally win over the request body: a client can never
  // select a different organization simply by submitting its organizationId.
  let record: unknown;
  try {
    record = await entry.config.adapter.create(validated.value);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new ValidationError(
        "Validation failed.",
        uniqueConstraintIssues(error, entry.fields),
      );
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
