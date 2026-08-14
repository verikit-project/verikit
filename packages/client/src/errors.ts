import type { ValidationIssueLike } from "./types.js";

/**
 * Known VeriKit error codes, mirrored without adding a core/server dependency.
 * `VerikitClientError.code` remains `string` for additional server codes.
 */
export type VerikitErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface VerikitClientErrorOptions {
  issues?: ValidationIssueLike[];
  extra?: Record<string, unknown>;
}

/**
 * Represents a failed client response using VeriKit's error envelope.
 * Branch on `code`; unrecognized responses use `"UNKNOWN"`.
 */
export class VerikitClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: ValidationIssueLike[];
  readonly extra?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    code: string,
    options: VerikitClientErrorOptions = {},
  ) {
    super(message);
    this.name = "VerikitClientError";
    this.status = status;
    this.code = code;
    this.issues = options.issues;
    this.extra = options.extra;
  }
}
