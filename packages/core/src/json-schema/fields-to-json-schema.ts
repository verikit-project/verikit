import { fieldApplicability } from "../fields/field-applicability.js";
import type { FieldSchema } from "../fields/base.js";
import { fieldToJsonSchema } from "./field-to-json-schema.js";
import type { JsonSchemaValue } from "./json-schema-value.js";

/**
 * The three surfaces a resource's fields can appear on: `create` and `update`
 * share field-set (both gated by `readOnly`) but differ in requirements;
 * `response` uses a different field-set (gated by `hidden`).
 */
export type JsonSchemaOperation = "create" | "update" | "response";

/** JSON Schema object shape produced for one operation's field set. */
export interface JsonSchemaObject extends JsonSchemaValue {
  type: "object";
  properties: Record<string, JsonSchemaValue>;
  required?: readonly string[];
  additionalProperties: false;
}

/**
 * Derives operation-scoped JSON Schema from a field map using `fieldApplicability()`
 * to filter by surface. Works on any `FieldSchema` map, so it covers both resources
 * and action `.form()` fields with a single helper.
 */
export function fieldsToJsonSchema(
  fields: Record<string, FieldSchema>,
  options: { operation: JsonSchemaOperation },
): JsonSchemaObject {
  const { operation } = options;
  const properties: Record<string, JsonSchemaValue> = {};
  const required: string[] = [];

  for (const [name, field] of Object.entries(fields)) {
    const applicability = fieldApplicability(field);
    if (!applicability[operation]) {
      continue;
    }

    properties[name] = fieldToJsonSchema(field);

    if (operation === "create" && field.required) {
      required.push(name);
    }
    if (operation === "response") {
      required.push(name);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 && { required }),
    additionalProperties: false,
  };
}
