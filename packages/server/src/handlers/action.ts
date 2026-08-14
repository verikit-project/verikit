import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  VerikitError,
} from "@verikit/core";
import type { ActionRunResult } from "@verikit/runtime";
import { runAction } from "@verikit/runtime";
import { requireJsonObjectBody } from "../http/parse-request.js";
import { dataResponse } from "../http/responses.js";
import { maybeCheckAction } from "../permissions.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

interface ActionRequestBody {
  input?: Record<string, unknown>;
  confirmed?: boolean;
  /** Looked up via the adapter to populate `record` for row-scoped actions. */
  recordId?: string;
}

/**
 * Maps an action result to a response or the appropriate `VerikitError`.
 * Unexpected execution failures become internal errors with the original cause preserved.
 */
function mapActionResult(result: ActionRunResult<unknown>): Response {
  if (result.success) {
    return dataResponse(result.result, { message: result.message });
  }

  switch (result.reason) {
    case "forbidden":
      throw new ForbiddenError(result.message);
    case "confirmation":
      throw new VerikitError(
        result.message ?? "Confirmation required.",
        "CONFIRMATION_REQUIRED",
        409,
        { confirmationRequired: true },
      );
    case "unavailable":
      throw new VerikitError(
        result.message ?? "Action unavailable.",
        "ACTION_UNAVAILABLE",
        422,
      );
    case "validation":
      // 422, matching this route's other failure statuses, rather than the 400 resource
      // create/update validation uses  same VALIDATION_ERROR code either way.
      throw new ValidationError("Validation failed.", result.issues, 422);
    case "execution": {
      if (result.error instanceof VerikitError) {
        throw result.error;
      }

      const wrapped = new VerikitError(
        result.message ?? "Action failed.",
        "INTERNAL_ERROR",
        500,
      );
      wrapped.cause = result.error;
      throw wrapped;
    }
  }
}

/** Handles `POST {base}/actions/:name`. */
export async function handleAction(
  ctx: HandlerContext,
  name: string,
): Promise<Response> {
  const { entry, actor, request } = ctx;
  const actionBuilder = entry.config.actions?.find(
    (candidate) => candidate.name === name,
  );

  if (!actionBuilder) {
    throw new NotFoundError(`Unknown action "${name}".`);
  }

  const parsedBody = await requireJsonObjectBody(request, {
    maxBodyBytes: ctx.maxBodyBytes,
  });

  const body = parsedBody as ActionRequestBody;
  let record: unknown;
  const scope = await resolveScope(entry, actor);

  if (typeof body.recordId === "string") {
    record = await entry.config.adapter.find(body.recordId, scope);

    if (!record) {
      throw new NotFoundError(`Record "${body.recordId}" not found.`);
    }
  }

  const permission = await maybeCheckAction(entry.config.permissions, name, {
    actor,
    record,
  });

  // Return 404 for denied record actions to avoid leaking record existence;
  // use 403 when no record is involved.
  if (!permission.allowed) {
    throw record !== undefined
      ? new NotFoundError(`Record "${body.recordId}" not found.`)
      : new ForbiddenError(permission.message);
  }

  const result = await runAction(actionBuilder, {
    context: actor,
    record,
    input: body.input,
    confirmed: body.confirmed,
  });

  if (
    !result.success &&
    result.reason === "forbidden" &&
    record !== undefined
  ) {
    throw new NotFoundError(`Record "${body.recordId}" not found.`);
  }

  return mapActionResult(result);
}
