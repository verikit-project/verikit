import type { ValidationIssue } from "../types/validation.js";

/**
 * Stable error codes for application-facing `VerikitError`s.
 * Consumers should branch on `code`, not `message`; internal errors may use
 * additional codes.
 */
export type VerikitErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

/**
 * Base class for known, client-safe errors.
 * Throw a subclass to expose a specific outcome; unexpected errors are
 * mapped to a generic internal error.
 */
export class VerikitError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "VerikitError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Represents resource or action validation failures.
 * Defaults to 400; consumers should branch on `code`, not status.
 */
export class ValidationError extends VerikitError {
  readonly issues: ValidationIssue[];

  constructor(
    message = "Validation failed.",
    issues: ValidationIssue[] = [],
    status = 400,
  ) {
    super(message, "VALIDATION_ERROR" satisfies VerikitErrorCode, status, {
      issues,
    });
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/** No actor could be established for this request. */
export class UnauthorizedError extends VerikitError {
  constructor(message = "Authentication required.") {
    super(message, "UNAUTHORIZED" satisfies VerikitErrorCode, 401);
    this.name = "UnauthorizedError";
  }
}

/** The actor is known but not permitted to perform this operation. */
export class ForbiddenError extends VerikitError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, "FORBIDDEN" satisfies VerikitErrorCode, 403);
    this.name = "ForbiddenError";
  }
}

/** The requested resource or record doesn't exist, or isn't visible to this actor. */
export class NotFoundError extends VerikitError {
  constructor(message = "Not found.") {
    super(message, "NOT_FOUND" satisfies VerikitErrorCode, 404);
    this.name = "NotFoundError";
  }
}

/** The request conflicts with the resource's current state. */
export class ConflictError extends VerikitError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFLICT" satisfies VerikitErrorCode, 409, details);
    this.name = "ConflictError";
  }
}
