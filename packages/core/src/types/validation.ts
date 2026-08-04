/**
 * A single validation failure, scoped to a path relative to the value being validated. `validateField` always reports an empty path; `validateResource` prefixes each field's issues with that field's name.
 */
export interface ValidationIssue {
  path: readonly (string | number)[];
  message: string;
}

/**
 * Result of running a validator. On success, `value` is the (possibly transformed, e.g. via `.validation()`) output. On failure, `issues` contains every collected problem.
 */
export type ValidationResult<TValue = unknown> =
  | { success: true; value: TValue }
  | { success: false; issues: ValidationIssue[] };
