import { FieldBuilder } from "./base.js";
import {
  StringLengthConstraints,
  withMaxLength,
  withMinLength,
} from "./shared/string-constraints.js";

/**
 * Schema describing a multi-line text field.
 */
export interface TextareaFieldSchema extends StringLengthConstraints {
  fieldType: "textarea";
}

/** Fluent builder for multi-line text fields. */
export class TextareaFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, TextareaFieldSchema> {
  constructor(
    state: Omit<TextareaFieldSchema, "type" | "name"> = {
      fieldType: "textarea",
    },
  ) {
    super(state);
  }

  /** Sets the minimum number of characters allowed. */
  min(length: number): TextareaFieldBuilder<TValue> {
    return new TextareaFieldBuilder(withMinLength(this.state, length));
  }

  /** Sets the maximum number of characters allowed. */
  max(length: number): TextareaFieldBuilder<TValue> {
    return new TextareaFieldBuilder(withMaxLength(this.state, length));
  }
}

/** Creates a multi-line text field. */
export function textarea(): TextareaFieldBuilder {
  return new TextareaFieldBuilder();
}
