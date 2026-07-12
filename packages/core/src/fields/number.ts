import { FieldBuilder, FieldSchema } from "./base.js";

/**
 * Schema describing a numeric field.
 *
 * Number fields represent integer or decimal values. UI adapters can use the
 * optional `min`, `max`, and `step` metadata to configure numeric inputs,
 * sliders, steppers, or validation messages.
 */
export interface NumberFieldSchema extends FieldSchema {
  /** Literal field type discriminator for numeric fields. */
  fieldType: "number";
  /** Smallest allowed value. */
  min?: number;
  /** Largest allowed value. */
  max?: number;
  /** Increment used by numeric controls. */
  step?: number;
}

/**
 * Fluent builder for numeric fields.
 *
 * Number fields inherit universal field behavior such as `.label()`,
 * `.required()`, `.nullable()`, `.default()`, `.hidden()`, and `.readOnly()`
 * from `FieldBuilder`, then add numeric constraints through `.min()`,
 * `.max()`, and `.step()`.
 */
export class NumberFieldBuilder<
  TValue = number | null | undefined,
> extends FieldBuilder<TValue, NumberFieldSchema> {
  constructor(
    state: Omit<NumberFieldSchema, "type" | "name"> = {
      fieldType: "number",
    },
  ) {
    super(state);
  }

  /**
   * Set the smallest allowed numeric value.
   *
   * @param value - Minimum accepted number.
   * @returns A new number field builder with the minimum value set.
   */
  min(value: number): NumberFieldBuilder<TValue> {
    return new NumberFieldBuilder({ ...this.state, min: value });
  }

  /**
   * Set the largest allowed numeric value.
   *
   * @param value - Maximum accepted number.
   * @returns A new number field builder with the maximum value set.
   */
  max(value: number): NumberFieldBuilder<TValue> {
    return new NumberFieldBuilder({ ...this.state, max: value });
  }

  /**
   * Set the increment used by numeric input controls.
   *
   * @param value - Step increment, such as `1`, `0.01`, or `5`.
   * @returns A new number field builder with the step value set.
   */
  step(value: number): NumberFieldBuilder<TValue> {
    return new NumberFieldBuilder({ ...this.state, step: value });
  }
}

/**
 * Create a numeric field.
 *
 * @returns A number field builder ready for fluent configuration.
 */
export function number(): NumberFieldBuilder {
  return new NumberFieldBuilder();
}
