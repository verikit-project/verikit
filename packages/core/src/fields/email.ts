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
 * Fluent builder for email fields. Attach `.validation()` for stricter runtime checks than the field type alone communicates.
 */
export class EmailFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, EmailFieldSchema> {
  /** Type-only; see `FieldBuilder.$kind`. @internal */
  declare readonly $kind: EmailFieldBuilder<this["$arg"]>;

  constructor(
    state: Omit<EmailFieldSchema, "type" | "name"> = {
      fieldType: "email",
      format: "email",
    },
  ) {
    super(state);
  }

  /** Sets the minimum number of characters allowed. */
  min(length: number): this {
    return this.withPatch(withMinLength(this.state, length));
  }

  /** Sets the maximum number of characters allowed. */
  max(length: number): this {
    return this.withPatch(withMaxLength(this.state, length));
  }
}

/** Creates an email field. */
export function email(): EmailFieldBuilder {
  return new EmailFieldBuilder();
}
