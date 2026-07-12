import { createField, FieldBuilder, FieldSchema } from "./base.js";

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
