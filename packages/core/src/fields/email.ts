import { createField, FieldBuilder } from "./base.js";
import { TextFieldSchema } from "./text.js";

export function email(): FieldBuilder<
  string | null | undefined,
  TextFieldSchema
> {
  return createField<string | null | undefined, TextFieldSchema>("email", {
    format: "email",
  });
}
