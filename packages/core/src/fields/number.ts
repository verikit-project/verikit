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

function assertFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
}

function assertValidNumberRange(
  state: Pick<NumberFieldSchema, "min" | "max">,
  patch: Pick<NumberFieldSchema, "min" | "max">,
): void {
  const min = patch.min ?? state.min;
  const max = patch.max ?? state.max;

  if (min !== undefined && max !== undefined && min > max) {
    throw new Error("min cannot be greater than max.");
  }
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
    assertFiniteNumber("min", value);
    assertValidNumberRange(this.state, { min: value });

    return new NumberFieldBuilder({ ...this.state, min: value });
  }

  /**
   * Set the largest allowed numeric value.
   *
   * @param value - Maximum accepted number.
   * @returns A new number field builder with the maximum value set.
   */
  max(value: number): NumberFieldBuilder<TValue> {
    assertFiniteNumber("max", value);
    assertValidNumberRange(this.state, { max: value });

    return new NumberFieldBuilder({ ...this.state, max: value });
  }

  /**
   * Set the increment used by numeric input controls.
   *
   * @param value - Step increment, such as `1`, `0.01`, or `5`.
   * @returns A new number field builder with the step value set.
   */
  step(value: number): NumberFieldBuilder<TValue> {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("step must be a positive finite number.");
    }

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
