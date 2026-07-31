import type { ValidationIssue } from "@verikit/core";

/** Builds the shared `{ data, meta?, message? }` success envelope. */
export function dataResponse(
  data: unknown,
  options: {
    status?: number;
    meta?: Record<string, unknown>;
    message?: string;
  } = {},
): Response {
  const body: Record<string, unknown> = { data: data ?? null };

  if (options.meta) {
    body.meta = options.meta;
  }

  if (options.message !== undefined) {
    body.message = options.message;
  }

  return Response.json(body, { status: options.status ?? 200 });
}

/** 204 No Content, for the delete route. */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

/** Builds the shared `{ error: { message, issues? } }` failure envelope. */
export function errorResponse(
  status: number,
  message: string,
  options: {
    issues?: ValidationIssue[];
    extra?: Record<string, unknown>;
  } = {},
): Response {
  return Response.json(
    {
      error: {
        message,
        ...(options.issues && { issues: options.issues }),
        ...options.extra,
      },
    },
    { status },
  );
}

export const notFoundResponse = (message = "Not found"): Response =>
  errorResponse(404, message);

export const forbiddenResponse = (message = "Forbidden"): Response =>
  errorResponse(403, message);

export const methodNotAllowedResponse = (): Response =>
  errorResponse(405, "Method not allowed");
