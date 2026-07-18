import type { ValidationIssue } from "@verikit/core";

/** Result presentation metadata used after execution. */
export interface ActionResultOptions<TResult = unknown> {
  successMessage?: string | ((result: TResult) => string);
  errorMessage?: string | ((error: unknown) => string);
}

/** Successful action run result. */
export interface ActionRunSuccess<TResult> {
  success: true;
  result: TResult;
  message?: string;
}

/** Failed action run result. */
export type ActionRunFailure =
  | {
      success: false;
      reason: "unavailable";
      message?: string;
    }
  | {
      success: false;
      reason: "validation";
      issues: ValidationIssue[];
    }
  | {
      success: false;
      reason: "execution";
      error: unknown;
      message?: string;
    };

/** Result returned by `runAction()`. */
export type ActionRunResult<TResult> =
  ActionRunSuccess<TResult> | ActionRunFailure;
