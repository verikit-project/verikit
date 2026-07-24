import {
  aggregateFieldResults,
  shouldValidateField,
  type FieldSchema,
  type ValidationResult,
} from "@verikit/core";
import { inferField } from "./infer-field.js";

/**
 * Infers typed values for a resource from raw input using each field's schema.
 * Optional fields omitted from the input are skipped unless they have defaults.
 */
export function inferResource(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
): ValidationResult<Record<string, unknown>> {
  return aggregateFieldResults(
    Object.entries(fields)
      .filter(([name, schema]) => shouldValidateField(name, schema, values))
      .map(([name, schema]): [string, ValidationResult] => [
        name,
        inferField(schema, values[name]),
      ]),
  );
}
