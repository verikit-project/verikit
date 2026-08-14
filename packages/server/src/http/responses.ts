import { NotFoundError, VerikitError } from "@verikit/core";

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

/**
 * Builds the standard error response envelope.
 * Consumers should branch on `code`, not `message`.
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

/**
 * Maps a `VerikitError` to its standard response.
 * Plain-object `details` are included in the error body.
 */
export function toErrorResponse(error: VerikitError): Response {
  const extra =
    error.details &&
    typeof error.details === "object" &&
    !Array.isArray(error.details)
      ? (error.details as Record<string, unknown>)
      : undefined;

  return errorResponse(error.status, error.code, error.message, extra);
}

/** For the routing layer's own "no resource matched this path" case, not a resource handler's. */
export const notFoundResponse = (message?: string): Response =>
  toErrorResponse(new NotFoundError(message));

export const methodNotAllowedResponse = (): Response =>
  errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
