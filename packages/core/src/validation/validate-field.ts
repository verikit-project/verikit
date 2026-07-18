import {
  FieldSchema,
  StandardSchemaIssue,
  StandardSchemaResult,
} from "../fields/base.js";
import { NumberFieldSchema } from "../fields/number.js";
import { FileConstraints } from "../fields/shared/file-constraints.js";
import { OptionFieldSchema } from "../fields/shared/options.js";
import { StringLengthConstraints } from "../fields/shared/string-constraints.js";
import { ValidationIssue, ValidationResult } from "../types/validation.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimal duck-typed shape for browser File/Blob-like upload values. */
export interface FileLike {
  name?: string;
  type?: string;
  size: number;
}

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

function isFileLike(value: unknown): value is FileLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as FileLike).size === "number"
  );
}

/** Flattens StandardSchema path segments (which may be `{ key }` objects) to strings/numbers. */
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

function validateStringLength(
  schema: StringLengthConstraints,
  value: string,
): ValidationIssue[] {
  const found: ValidationIssue[] = [];

  if (schema.minLength !== undefined && value.length < schema.minLength) {
    found.push(issue(`Must be at least ${schema.minLength} characters.`));
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    found.push(issue(`Must be at most ${schema.maxLength} characters.`));
  }

  return found;
}

function validateNumber(
  schema: NumberFieldSchema,
  value: number,
): ValidationIssue[] {
  if (!Number.isFinite(value)) {
    return [issue("Must be a finite number.")];
  }

  const found: ValidationIssue[] = [];

  if (schema.min !== undefined && value < schema.min) {
    found.push(issue(`Must be at least ${schema.min}.`));
  }
  if (schema.max !== undefined && value > schema.max) {
    found.push(issue(`Must be at most ${schema.max}.`));
  }
  if (schema.step !== undefined) {
    const base = schema.min ?? 0;
    const steps = (value - base) / schema.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-9) {
      found.push(issue(`Must be a multiple of ${schema.step}.`));
    }
  }

  return found;
}

function validateOption(
  schema: OptionFieldSchema,
  value: unknown,
): ValidationIssue[] {
  if (!schema.options || schema.options.length === 0) {
    return [];
  }

  const isAllowed = schema.options.some((option) => option.value === value);
  return isAllowed ? [] : [issue("Must be one of the allowed options.")];
}

function matchesAccept(patterns: readonly string[], file: FileLike): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/*")) {
      return file.type?.startsWith(pattern.slice(0, -1)) ?? false;
    }
    if (pattern.startsWith(".")) {
      return file.name?.toLowerCase().endsWith(pattern.toLowerCase()) ?? false;
    }
    return file.type === pattern;
  });
}

function validateSingleFile(
  schema: FileConstraints,
  value: unknown,
  path: readonly (string | number)[],
): ValidationIssue[] {
  if (typeof value === "string") {
    return [];
  }

  if (!isFileLike(value)) {
    return [issue("Must be a file reference or upload.", path)];
  }

  const found: ValidationIssue[] = [];

  if (schema.maxSize !== undefined && value.size > schema.maxSize) {
    found.push(
      issue(`File must be smaller than ${schema.maxSize} bytes.`, path),
    );
  }
  if (
    schema.accept &&
    schema.accept.length > 0 &&
    !matchesAccept(schema.accept, value)
  ) {
    found.push(issue("File type is not allowed.", path));
  }

  return found;
}

function validateFile(
  schema: FileConstraints,
  value: unknown,
): ValidationIssue[] {
  if (!schema.multiple) {
    return validateSingleFile(schema, value, []);
  }

  if (!Array.isArray(value)) {
    return [issue("Must be a list of files.")];
  }

  return value.flatMap((file, index) =>
    validateSingleFile(schema, file, [index]),
  );
}

function validateByType(
  schema: FieldSchema,
  value: unknown,
): ValidationIssue[] {
  switch (schema.fieldType) {
    case "text":
    case "textarea":
    case "email": {
      if (typeof value !== "string") {
        return [issue("Must be a string.")];
      }

      const found = validateStringLength(
        schema as StringLengthConstraints,
        value,
      );
      if (schema.fieldType === "email" && !EMAIL_PATTERN.test(value)) {
        found.push(issue("Must be a valid email address."));
      }
      return found;
    }

    case "number": {
      if (typeof value !== "number") {
        return [issue("Must be a number.")];
      }
      return validateNumber(schema as NumberFieldSchema, value);
    }

    case "boolean": {
      return typeof value === "boolean" ? [] : [issue("Must be a boolean.")];
    }

    case "date":
    case "datetime": {
      if (!(value instanceof Date) && typeof value !== "string") {
        return [issue("Must be a valid date.")];
      }

      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime())
        ? [issue("Must be a valid date.")]
        : [];
    }

    case "select": {
      return validateOption(schema as OptionFieldSchema, value);
    }

    case "file":
    case "image": {
      return validateFile(schema as FileConstraints, value);
    }

    default:
      return [];
  }
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

  const found = validateByType(schema, value);
  return found.length > 0 ? issues(found) : ok(value);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rejectAsyncValidator<TValue>(
  result: TValue,
): asserts result is Exclude<TValue, Promise<unknown>> {
  if (!(result instanceof Promise)) {
    return;
  }

  // Prevent an unhandled rejection if the async validator later rejects.
  void result.catch(() => {});

  throw new Error(
    "Async validators are not supported by validateField(); use validateFieldAsync() instead.",
  );
}

/**
 * Validates a value against a finalized `FieldSchema`: built-in constraint
 * checks first, then any attached `.validation()` validator. Reports an
 * issue if that validator resolves asynchronously; use `validateFieldAsync`.
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
    if (validator.parse) {
      const result = validator.parse(builtIn.value);
      rejectAsyncValidator(result);
      return ok(result);
    }
    if (validator["~standard"]) {
      const result = validator["~standard"].validate(builtIn.value);
      rejectAsyncValidator(result);
      return fromStandardResult(result);
    }
    return builtIn;
  } catch (error) {
    return issues([issue(describeError(error))]);
  }
}

/**
 * Async counterpart to `validateField`, for `.validation()` validators whose
 * `parse` or `~standard.validate` resolves via a Promise.
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
    if (validator.parse) {
      return ok(await validator.parse(builtIn.value));
    }
    if (validator["~standard"]) {
      return fromStandardResult(
        await validator["~standard"].validate(builtIn.value),
      );
    }
    return builtIn;
  } catch (error) {
    return issues([issue(describeError(error))]);
  }
}
