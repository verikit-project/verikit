import type { ValidationIssueLike } from "./types.js";

export interface VerikitClientErrorOptions {
  issues?: ValidationIssueLike[];
  extra?: Record<string, unknown>;
}
// Thrown for any non-2xx, non-204 response. Mirrors `@verikit/server`'s generic
// error envelope. Distinguish cases via `status` and `extra`, not `instanceof`.
export class VerikitClientError extends Error {
  readonly status: number;
  readonly issues?: ValidationIssueLike[];
  readonly extra?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    options: VerikitClientErrorOptions = {},
  ) {
    super(message);
    this.name = "VerikitClientError";
    this.status = status;
    this.issues = options.issues;
    this.extra = options.extra;
  }
}
