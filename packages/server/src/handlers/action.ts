import type { ActionRunResult } from "@verikit/runtime";
import { runAction } from "@verikit/runtime";
import { parseJsonObjectBody } from "../http/parse-request.js";
import {
  dataResponse,
  errorResponse,
  notFoundResponse,
} from "../http/responses.js";
import type { HandlerContext } from "./context.js";

interface ActionRequestBody {
  input?: Record<string, unknown>;
  confirmed?: boolean;
  /** Looked up via the adapter to populate `record` for row-scoped actions. */
  recordId?: string;
}

function mapActionResult(result: ActionRunResult<unknown>): Response {
  if (result.success) {
    return dataResponse(result.result, { message: result.message });
  }

  switch (result.reason) {
    case "forbidden":
      return errorResponse(403, result.message ?? "Forbidden");
    case "confirmation":
      return errorResponse(409, result.message ?? "Confirmation required.", {
        extra: { confirmationRequired: true },
      });
    case "unavailable":
      return errorResponse(422, result.message ?? "Action unavailable.");
    case "validation":
      return errorResponse(422, "Validation failed.", {
        issues: result.issues,
      });
    case "execution":
      return errorResponse(500, result.message ?? "Action failed.");
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
    return notFoundResponse(`Unknown action "${name}".`);
  }

  const parsedBody = await parseJsonObjectBody(request);

  if (!parsedBody.ok) {
    return errorResponse(400, "Invalid JSON body.");
  }

  const body = parsedBody.value as ActionRequestBody;
  let record: unknown;

  if (typeof body.recordId === "string") {
    record = await entry.config.adapter.find(body.recordId);

    if (!record) {
      return notFoundResponse(`Record "${body.recordId}" not found.`);
    }
  }

  const result = await runAction(actionBuilder, {
    context: actor,
    record,
    input: body.input,
    confirmed: body.confirmed,
  });

  return mapActionResult(result);
}
