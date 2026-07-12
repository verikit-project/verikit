import { createField, FieldBuilder, FieldSchema } from "./base.js";

/**
 * Schema describing a boolean field.
 *
 * Boolean fields represent true/false values and are typically rendered
 * as checkboxes, switches, or toggles by UI adapters.
 */
export interface BooleanFieldSchema extends FieldSchema {
  fieldType: "boolean";
}

export function boolean(): FieldBuilder<
  boolean | null | undefined,
  BooleanFieldSchema
> {
  return createField<boolean | null | undefined, BooleanFieldSchema>("boolean");
}

export const toggle = boolean;
