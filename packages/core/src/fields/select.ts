import { FieldBuilder, FieldOption, OptionValue } from "./base.js";
import { normalizeOptions, OptionFieldSchema } from "./shared/options.js";

/**
 * Schema describing a select field with enumerated options.
 */
export interface SelectFieldSchema<
  TValue extends OptionValue = OptionValue,
> extends OptionFieldSchema<TValue> {
  fieldType: "select";
}

/**
 * Fluent builder for select fields.
 *
 * Select fields constrain values to a finite option list. Options may be
 * supplied as raw primitive values or as `{ label, value }` objects.
 */
export class SelectFieldBuilder<
  TValue extends OptionValue = OptionValue,
> extends FieldBuilder<TValue | null | undefined, SelectFieldSchema<TValue>> {
  constructor(
    state: Omit<SelectFieldSchema<TValue>, "type" | "name"> = {
      fieldType: "select",
    },
  ) {
    super(state);
  }

  /**
   * Set select options from primitive values.
   */
  options<const TOptions extends readonly TValue[]>(
    options: TOptions,
  ): FieldBuilder<
    TOptions[number] | null | undefined,
    SelectFieldSchema<TOptions[number]>
  >;
  /**
   * Set select options from labelled option objects.
   */
  options<const TOptions extends readonly FieldOption<TValue>[]>(
    options: TOptions,
  ): FieldBuilder<
    TOptions[number]["value"] | null | undefined,
    SelectFieldSchema<TOptions[number]["value"]>
  >;
  options(options: readonly (TValue | FieldOption<TValue>)[]) {
    return new FieldBuilder({
      ...this.state,
      options: normalizeOptions(options),
    });
  }
}

/**
 * Create a select field.
 */
export function select<
  TValue extends OptionValue = OptionValue,
>(): SelectFieldBuilder<TValue> {
  return new SelectFieldBuilder<TValue>();
}
