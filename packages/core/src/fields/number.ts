import { FieldBuilder, FieldBuilderWithValue, FieldSchema } from "./base.js";

/**
 * Schema describing a numeric field. `min`, `max`, and `step` provide hints for UI adapters.
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

  /** Sets the smallest allowed value. */
  min(value: number): FieldBuilderWithValue<this, TValue, NumberFieldSchema> {
    assertFiniteNumber("min", value);
    assertValidNumberRange(this.state, { min: value });

    return this.withState({ min: value });
  }

  /** Sets the largest allowed value. */
  max(value: number): FieldBuilderWithValue<this, TValue, NumberFieldSchema> {
    assertFiniteNumber("max", value);
    assertValidNumberRange(this.state, { max: value });

    return this.withState({ max: value });
  }

  /** Sets the increment used by numeric input controls. */
  step(value: number): FieldBuilderWithValue<this, TValue, NumberFieldSchema> {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("step must be a positive finite number.");
    }

    return this.withState({ step: value });
  }
}

/** Creates a numeric field. */
export function number(): NumberFieldBuilder {
  return new NumberFieldBuilder();
}
