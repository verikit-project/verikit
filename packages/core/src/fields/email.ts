import { FieldBuilder } from "./base.js";
import {
  StringLengthConstraints,
  withMaxLength,
  withMinLength,
} from "./shared/string-constraints.js";

/**
 * Schema describing an email field.
 */
export interface EmailFieldSchema extends StringLengthConstraints {
  fieldType: "email";
  format: "email";
}

/**
 * Fluent builder for email fields.
 *
 * Email fields are string fields with email semantics. Runtime validation
 * can still be supplied with `.validation()` when an adapter needs stricter
 * behavior than the field type alone communicates.
 */
export class EmailFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, EmailFieldSchema> {
  constructor(
    state: Omit<EmailFieldSchema, "type" | "name"> = {
      fieldType: "email",
      format: "email",
    },
  ) {
    super(state);
  }

  /**
   * Set the minimum number of characters allowed.
   */
  min(length: number): EmailFieldBuilder<TValue> {
    return new EmailFieldBuilder(withMinLength(this.state, length));
  }

  /**
   * Set the maximum number of characters allowed.
   */
  max(length: number): EmailFieldBuilder<TValue> {
    return new EmailFieldBuilder(withMaxLength(this.state, length));
  }
}

/**
 * Create an email field.
 */
export function email(): EmailFieldBuilder {
  return new EmailFieldBuilder();
}
