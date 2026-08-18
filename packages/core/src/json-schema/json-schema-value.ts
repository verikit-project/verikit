/** JSON Schema `type` keyword values VeriKit emits. */
export type JsonSchemaType =
  "string" | "number" | "integer" | "boolean" | "array" | "object" | "null";

/**
 * Minimal local JSON Schema (2020-12) subset for VeriKit's fields/resources,
 * dependency-free. `x-`-prefixed keys are documentation-only vendor extensions
 * (date ranges, upload constraints, etc.), never enforced.
 */
export interface JsonSchemaValue {
  type?: JsonSchemaType | JsonSchemaType[];
  format?: string;
  enum?: readonly (string | number | boolean | null)[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  default?: unknown;
  description?: string;
  items?: JsonSchemaValue;
  properties?: Record<string, JsonSchemaValue>;
  required?: readonly string[];
  additionalProperties?: boolean;
  [key: `x-${string}`]: unknown;
}
