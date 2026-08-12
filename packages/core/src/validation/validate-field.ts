import {
  FieldSchema,
  StandardSchemaIssue,
  StandardSchemaResult,
} from "../fields/base.js";
import { validateBuiltInFieldConstraints } from "../fields/shared/built-in-constraints.js";
import { ValidationIssue, ValidationResult } from "../types/validation.js";

export type { FileLike } from "../fields/shared/built-in-constraints.js";
export { matchesAccept } from "../fields/shared/built-in-constraints.js";

function issue(
  message: string,
  path: readonly (string | number)[] = [],
): ValidationIssue {
  return { path, message };
}

function ok(value: unknown): ValidationResult {
  return { success: true, value };
}

function issues(list: ValidationIssue[]): ValidationResult {
  return { success: false, issues: list };
}

/**
 * Flattens StandardSchema path segments (which may be `{ key }` objects) to strings/numbers.
 */
function normalizeIssuePath(
  path: readonly unknown[] = [],
): (string | number)[] {
  return path
    .map((segment) => {
      if (typeof segment === "string" || typeof segment === "number") {
        return segment;
      }
      if (typeof segment === "object" && segment !== null && "key" in segment) {
        const key = (segment as { key: unknown }).key;
        return typeof key === "string" || typeof key === "number"
          ? key
          : undefined;
      }
      return undefined;
    })
    .filter((segment): segment is string | number => segment !== undefined);
}

function fromStandardIssue(schemaIssue: StandardSchemaIssue): ValidationIssue {
  return issue(schemaIssue.message, normalizeIssuePath(schemaIssue.path));
}

function fromStandardResult(
  result: StandardSchemaResult<unknown>,
): ValidationResult {
  return "issues" in result
    ? issues(result.issues.map(fromStandardIssue))
    : ok(result.value);
}

function runBuiltInChecks(
  schema: FieldSchema,
  rawValue: unknown,
): ValidationResult {
  const value =
    rawValue === undefined && schema.defaultValue !== undefined
      ? schema.defaultValue
      : rawValue;

  if (value === undefined) {
    return schema.required
      ? issues([issue("This field is required.")])
      : ok(value);
  }

  if (value === null) {
    return schema.nullable
      ? ok(value)
      : issues([issue("This field cannot be null.")]);
  }

  const found = validateBuiltInFieldConstraints(schema, value);
  return found.length > 0 ? issues(found) : ok(value);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rejectAsyncValidator<TValue>(
  result: TValue,
): asserts result is Exclude<TValue, Promise<unknown>> {
  if (
    (typeof result !== "object" && typeof result !== "function") ||
    result === null ||
    !("then" in result) ||
    typeof result.then !== "function"
  ) {
    return;
  }

  // Prevent an unhandled rejection if the async validator later rejects.
  if ("catch" in result && typeof result.catch === "function") {
    void result.catch(() => {});
  }

  throw new Error(
    "Async validators are not supported by validateField(); use validateFieldAsync() instead.",
  );
}

/**
 * Validates a value against a finalized `FieldSchema`: built-in constraint checks first, then any attached `.validation()` validator. Reports an issue if that validator resolves asynchronously; use `validateFieldAsync`.
 */
export function validateField(
  schema: FieldSchema,
  value: unknown,
): ValidationResult {
  const builtIn = runBuiltInChecks(schema, value);
  if (!builtIn.success) {
    return builtIn;
  }

  const validator = schema.validation;
  if (!validator) {
    return builtIn;
  }

  try {
    if (validator["~standard"]) {
      const result = validator["~standard"].validate(builtIn.value);
      rejectAsyncValidator(result);
      return fromStandardResult(result);
    }
    if (validator.parse) {
      const result = validator.parse(builtIn.value);
      rejectAsyncValidator(result);
      return ok(result);
    }
    return builtIn;
  } catch (error) {
    return issues([issue(describeError(error))]);
  }
}

/**
 * Async counterpart to `validateField`, for `.validation()` validators whose `parse` or `~standard.validate` resolves via a Promise.
 */
export async function validateFieldAsync(
  schema: FieldSchema,
  value: unknown,
): Promise<ValidationResult> {
  const builtIn = runBuiltInChecks(schema, value);
  if (!builtIn.success) {
    return builtIn;
  }

  const validator = schema.validation;
  if (!validator) {
    return builtIn;
  }

  try {
    if (validator["~standard"]) {
      return fromStandardResult(
        await validator["~standard"].validate(builtIn.value),
      );
    }
    if (validator.parse) {
      return ok(await validator.parse(builtIn.value));
    }
    return builtIn;
  } catch (error) {
    return issues([issue(describeError(error))]);
  }
}
