import { createField, FieldBuilder, FieldSchema } from "./base.js";

/**
 * Schema describing a boolean field rendered as a checkbox, switch, or toggle.
 */
export interface BooleanFieldSchema extends FieldSchema {
  fieldType: "boolean";
}

/** Creates a boolean field. */
export function boolean(): FieldBuilder<
  boolean | null | undefined,
  BooleanFieldSchema
> {
  return createField<boolean | null | undefined, BooleanFieldSchema>("boolean");
}

/** Alias for `boolean()`, for adapters that render it as a switch. */
export const toggle = boolean;
