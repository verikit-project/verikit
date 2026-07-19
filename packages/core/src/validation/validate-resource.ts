import { FieldSchema } from "../fields/base.js";
import { validateField, validateFieldAsync } from "./validate-field.js";
import { ValidationIssue, ValidationResult } from "../types/validation.js";

/** Merges field validation results into a single resource validation result. */
function aggregate(
  entries: readonly [string, ValidationResult][],
): ValidationResult<Record<string, unknown>> {
  const issues: ValidationIssue[] = [];
  const result: Record<string, unknown> = {};

  for (const [name, fieldResult] of entries) {
    if (fieldResult.success) {
      result[name] = fieldResult.value;
    } else {
      for (const fieldIssue of fieldResult.issues) {
        issues.push({
          path: [name, ...fieldIssue.path],
          message: fieldIssue.message,
        });
      }
    }
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, value: result };
}

/**
 * Validates values against a resource's field schemas.
 * Relationships are intentionally excluded because they describe schema
 * structure rather than value payloads.
 */
export function validateResource(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
): ValidationResult<Record<string, unknown>> {
  return aggregate(
    Object.entries(fields).map(([name, schema]) => [
      name,
      validateField(schema, values[name]),
    ]),
  );
}

/** Async variant of `validateResource` for async field validators. */
export async function validateResourceAsync(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
): Promise<ValidationResult<Record<string, unknown> {
  const entries = await Promise.all(
    Object.entries(fields).map(
      async ([name, schema]): Promise<[string, ValidationResult]> => [
        name,
        await validateFieldAsync(schema, values[name]),
      ],
    ),
  );

  return aggregate(entries);
}
