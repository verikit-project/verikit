import type {
  FieldOption,
  FieldSchema,
  OptionValue,
  ValidationIssue,
  ValidationResult,
} from "@verikit/core";

function issue(message: string): ValidationIssue {
  return { path: [], message };
}

function ok(value: unknown): ValidationResult {
  return { success: true, value };
}

function fail(message: string): ValidationResult {
  return { success: false, issues: [issue(message)] };
}

function inferString(value: unknown): ValidationResult {
  return typeof value === "string" ? ok(value) : fail("Cannot infer a string.");
}

function inferNumber(value: unknown): ValidationResult {
  if (typeof value === "number") {
    return Number.isNaN(value) ? fail("Cannot infer a number.") : ok(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isNaN(parsed) ? fail("Cannot infer a number.") : ok(parsed);
  }

  return fail("Cannot infer a number.");
}

const TRUE_STRINGS = new Set(["true", "1", "yes", "on"]);
const FALSE_STRINGS = new Set(["false", "0", "no", "off"]);

function inferBoolean(value: unknown): ValidationResult {
  if (typeof value === "boolean") {
    return ok(value);
  }

  if (typeof value === "number") {
    if (value === 1) return ok(true);
    if (value === 0) return ok(false);
    return fail("Cannot infer a boolean.");
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUE_STRINGS.has(normalized)) return ok(true);
    if (FALSE_STRINGS.has(normalized)) return ok(false);
    return fail("Cannot infer a boolean.");
  }

  return fail("Cannot infer a boolean.");
}

function inferDate(value: unknown): ValidationResult {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? fail("Cannot infer a date.")
      : ok(value);
  }

  if (typeof value === "string") {
    const parsed = new Date(value.trim());
    return Number.isNaN(parsed.getTime())
      ? fail("Cannot infer a date.")
      : ok(parsed);
  }

  return fail("Cannot infer a date.");
}

function findOption(
  options: readonly FieldOption<OptionValue>[],
  value: unknown,
): FieldOption<OptionValue> | undefined {
  return (
    options.find((option) => option.value === value) ??
    options.find((option) => String(option.value) === String(value))
  );
}

function inferOption(schema: FieldSchema, value: unknown): ValidationResult {
  if (!schema.options || schema.options.length === 0) {
    return ok(value);
  }

  const match = findOption(schema.options, value);
  return match
    ? ok(match.value)
    : fail("Cannot infer a value from the configured options.");
}

function inferByType(schema: FieldSchema, value: unknown): ValidationResult {
  switch (schema.fieldType) {
    case "text":
    case "textarea":
    case "email":
      return inferString(value);

    case "number":
      return inferNumber(value);

    case "boolean":
      return inferBoolean(value);

    case "date":
    case "datetime":
      return inferDate(value);

    case "select":
      return inferOption(schema, value);

    case "file":
    case "image":
      // Upload values (a File/Blob-like object or a stored reference string)
      // are already the type they need to be; validateField checks shape.
      return ok(value);

    default:
      return ok(value);
  }
}

/**
 * Converts a raw value into the runtime type expected by a field schema.
 * Empty strings are normalized to `undefined`. Validation is performed
 * separately by `validateField`.
 */
export function inferField(
  schema: FieldSchema,
  rawValue: unknown,
): ValidationResult {
  const value =
    typeof rawValue === "string" && rawValue.trim().length === 0
      ? undefined
      : rawValue;

  if (value === undefined || value === null) {
    return ok(value);
  }

  return inferByType(schema, value);
}
