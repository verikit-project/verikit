import { FieldBuilder } from "./base.js";
import {
  StringLengthConstraints,
  withMaxLength,
  withMinLength,
} from "./shared/string-constraints.js";

/**
 * Schema describing a single-line text field.
 */
export interface TextFieldSchema extends StringLengthConstraints {
  fieldType: "text";
}

/**
 * Fluent builder for single-line text fields.
 *
 * Text fields support the universal field modifiers from `FieldBuilder`,
 * plus string length constraints through `.min()` and `.max()`.
 */
export class TextFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, TextFieldSchema> {
  constructor(
    state: Omit<TextFieldSchema, "type" | "name"> = {
      fieldType: "text",
    },
  ) {
    super(state);
  }

  /**
   * Set the minimum number of characters allowed.
   */
  min(length: number): TextFieldBuilder<TValue> {
    return new TextFieldBuilder(withMinLength(this.state, length));
  }

  /**
   * Set the maximum number of characters allowed.
   */
  max(length: number): TextFieldBuilder<TValue> {
    return new TextFieldBuilder(withMaxLength(this.state, length));
  }
}

/**
 * Create a single-line text field.
 */
export function text(): TextFieldBuilder {
  return new TextFieldBuilder();
}
