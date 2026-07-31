import type { FieldSchema } from "../base.js";
import type { ValidationIssue } from "../../types/validation.js";

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

function schemaConstraints(schema: FieldSchema): Record<string, unknown> {
  return schema as FieldSchema & Record<string, unknown>;
}

function isFileLike(value: unknown): value is FileLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as FileLike).size === "number"
  );
}

function validateStringLength(
  schema: FieldSchema,
  value: string,
): ValidationIssue[] {
  const constraints = schemaConstraints(schema);
  const found: ValidationIssue[] = [];

  if (
    typeof constraints.minLength === "number" &&
    value.length < constraints.minLength
  ) {
    found.push(issue(`Must be at least ${constraints.minLength} characters.`));
  }
  if (
    typeof constraints.maxLength === "number" &&
    value.length > constraints.maxLength
  ) {
    found.push(issue(`Must be at most ${constraints.maxLength} characters.`));
  }

  return found;
}

function validateNumber(schema: FieldSchema, value: number): ValidationIssue[] {
  if (!Number.isFinite(value)) {
    return [issue("Must be a finite number.")];
  }

  const constraints = schemaConstraints(schema);
  const found: ValidationIssue[] = [];

  if (typeof constraints.min === "number" && value < constraints.min) {
    found.push(issue(`Must be at least ${constraints.min}.`));
  }
  if (typeof constraints.max === "number" && value > constraints.max) {
    found.push(issue(`Must be at most ${constraints.max}.`));
  }
  if (typeof constraints.step === "number") {
    const base = typeof constraints.min === "number" ? constraints.min : 0;
    const steps = (value - base) / constraints.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-9) {
      found.push(issue(`Must be a multiple of ${constraints.step}.`));
    }
  }

  return found;
}

function validateDateRange(schema: FieldSchema, date: Date): ValidationIssue[] {
  const constraints = schemaConstraints(schema);
  const found: ValidationIssue[] = [];

  if (
    typeof constraints.min === "string" ||
    constraints.min instanceof Date
  ) {
    const min =
      constraints.min instanceof Date ? constraints.min : new Date(constraints.min);
    if (date.getTime() < min.getTime()) {
      found.push(issue(`Must be on or after ${min.toISOString()}.`));
    }
  }

  if (
    typeof constraints.max === "string" ||
    constraints.max instanceof Date
  ) {
    const max =
      constraints.max instanceof Date ? constraints.max : new Date(constraints.max);
    if (date.getTime() > max.getTime()) {
      found.push(issue(`Must be on or before ${max.toISOString()}.`));
    }
  }

  return found;
}

function validateOption(
  schema: FieldSchema,
  value: unknown,
): ValidationIssue[] {
  const constraints = schemaConstraints(schema);
  const options = constraints.options;

  if (!Array.isArray(options) || options.length === 0) {
    return [issue("Select fields must define at least one option.")];
  }

  const isAllowed = options.some(
    (option) =>
      typeof option === "object" &&
      option !== null &&
      "value" in option &&
      option.value === value,
  );

  return isAllowed ? [] : [issue("Must be one of the allowed options.")];
}

function matchesAccept(patterns: readonly string[], file: FileLike): boolean {
  const fileType = file.type?.toLowerCase();
  const fileName = file.name?.toLowerCase();

  return patterns.some((pattern) => {
    const normalizedPattern = pattern.toLowerCase();

    if (normalizedPattern.endsWith("/*")) {
      return fileType?.startsWith(normalizedPattern.slice(0, -1)) ?? false;
    }

    if (normalizedPattern.startsWith(".")) {
      return fileName?.endsWith(normalizedPattern) ?? false;
    }

    return fileType === normalizedPattern;
  });
}

function validateSingleFile(
  schema: FieldSchema,
  value: unknown,
  path: readonly (string | number)[],
): ValidationIssue[] {
  if (typeof value === "string") {
    return [];
  }

  if (!isFileLike(value)) {
    return [issue("Must be a file reference or upload.", path)];
  }

  const constraints = schemaConstraints(schema);
  const found: ValidationIssue[] = [];

  if (
    typeof constraints.maxSize === "number" &&
    value.size > constraints.maxSize
  ) {
    found.push(
      issue(`File must be smaller than ${constraints.maxSize} bytes.`, path),
    );
  }

  if (
    Array.isArray(constraints.accept) &&
    constraints.accept.length > 0 &&
    constraints.accept.every((entry) => typeof entry === "string") &&
    !matchesAccept(constraints.accept, value)
  ) {
    found.push(issue("File type is not allowed.", path));
  }

  return found;
}

function validateFile(schema: FieldSchema, value: unknown): ValidationIssue[] {
  const constraints = schemaConstraints(schema);

  if (constraints.multiple !== true) {
    return validateSingleFile(schema, value, []);
  }

  if (!Array.isArray(value)) {
    return [issue("Must be a list of files.")];
  }

  return value.flatMap((file, index) =>
    validateSingleFile(schema, file, [index]),
  );
}

export function validateBuiltInFieldConstraints(
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

      const found = validateStringLength(schema, value);
      if (schema.fieldType === "email" && !EMAIL_PATTERN.test(value)) {
        found.push(issue("Must be a valid email address."));
      }
      return found;
    }

    case "number": {
      if (typeof value !== "number") {
        return [issue("Must be a number.")];
      }
      return validateNumber(schema, value);
    }

    case "boolean":
      return typeof value === "boolean" ? [] : [issue("Must be a boolean.")];

    case "date":
    case "datetime": {
      if (!(value instanceof Date) && typeof value !== "string") {
        return [issue("Must be a valid date.")];
      }

      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime())
        ? [issue("Must be a valid date.")]
        : validateDateRange(schema, date);
    }

    case "select":
      return validateOption(schema, value);

    case "file":
    case "image":
      return validateFile(schema, value);

    default:
      return [];
  }
}
