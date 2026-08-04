import { FieldSchema } from "../fields/base.js";
import { validateField, validateFieldAsync } from "./validate-field.js";
import { ValidationIssue, ValidationResult } from "../types/validation.js";

/**
 * Merges per-field results (from `validateField`, `validateFieldAsync`, or any other function returning the same shape, e.g. `@verikit/runtime`'s `inferField`) into a single resource-level result, prefixing each field's issue paths with its name.
 */
export function aggregateFieldResults(
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

export function shouldValidateField(
  name: string,
  schema: FieldSchema,
  values: Record<string, unknown>,
): boolean {
  return (
    Object.hasOwn(values, name) ||
    schema.required === true ||
    schema.defaultValue !== undefined
  );
}

/**
 * Validates values against a resource's field schemas. Relationships are intentionally excluded because they describe schema structure rather than value payloads.
 */
export function validateResource(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
): ValidationResult<Record<string, unknown>> {
  return aggregateFieldResults(
    Object.entries(fields)
      .filter(([name, schema]) => shouldValidateField(name, schema, values))
      .map(([name, schema]) => [name, validateField(schema, values[name])]),
  );
}

/** Async variant of `validateResource` for async field validators. */
export async function validateResourceAsync(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
): Promise<ValidationResult<Record<string, unknown>>> {
  const entries = await Promise.all(
    Object.entries(fields)
      .filter(([name, schema]) => shouldValidateField(name, schema, values))
      .map(async ([name, schema]): Promise<[string, ValidationResult]> => [
        name,
        await validateFieldAsync(schema, values[name]),
      ]),
  );

  return aggregateFieldResults(entries);
}
