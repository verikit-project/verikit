import { FieldBuilder, FieldSchema } from "./base.js";

export interface NumberFieldSchema extends FieldSchema {
  fieldType: "number";
  min?: number;
  max?: number;
  step?: number;
}

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

  min(value: number): NumberFieldBuilder<TValue> {
    return new NumberFieldBuilder({ ...this.state, min: value });
  }

  max(value: number): NumberFieldBuilder<TValue> {
    return new NumberFieldBuilder({ ...this.state, max: value });
  }

  step(value: number): NumberFieldBuilder<TValue> {
    return new NumberFieldBuilder({ ...this.state, step: value });
  }
}

export function number(): NumberFieldBuilder {
  return new NumberFieldBuilder();
}
