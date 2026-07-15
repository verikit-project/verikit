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

/** Fluent builder for single-line text fields. */
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

  /** Sets the minimum number of characters allowed. */
  min(length: number): TextFieldBuilder<TValue> {
    return new TextFieldBuilder(withMinLength(this.state, length));
  }

  /** Sets the maximum number of characters allowed. */
  max(length: number): TextFieldBuilder<TValue> {
    return new TextFieldBuilder(withMaxLength(this.state, length));
  }
}

/** Creates a single-line text field. */
export function text(): TextFieldBuilder {
  return new TextFieldBuilder();
}
