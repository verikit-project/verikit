import { FieldBuilder, FieldBuilderWithValue } from "./base.js";
import {
  DateRangeConstraints,
  withMaxDate,
  withMinDate,
} from "./shared/date-constraints.js";

/**
 * Schema describing a date-only field.
 */
export interface DateFieldSchema extends DateRangeConstraints {
  fieldType: "date";
}

/**
 * Schema describing a date-and-time field.
 */
export interface DateTimeFieldSchema extends DateRangeConstraints {
  fieldType: "datetime";
}

/**
 * Fluent builder for date-only fields.
 */
export class DateFieldBuilder<
  TValue = Date | string | null | undefined,
> extends FieldBuilder<TValue, DateFieldSchema> {
  constructor(
    state: Omit<DateFieldSchema, "type" | "name"> = {
      fieldType: "date",
    },
  ) {
    super(state);
  }

  /** Sets the earliest allowed date. */
  min(value: Date | string): FieldBuilderWithValue<this, TValue, DateFieldSchema> {
    return this.withState(withMinDate(this.state, value));
  }

  /** Sets the latest allowed date. */
  max(value: Date | string): FieldBuilderWithValue<this, TValue, DateFieldSchema> {
    return this.withState(withMaxDate(this.state, value));
  }
}

/**
 * Fluent builder for date-and-time fields.
 */
export class DateTimeFieldBuilder<
  TValue = Date | string | null | undefined,
> extends FieldBuilder<TValue, DateTimeFieldSchema> {
  constructor(
    state: Omit<DateTimeFieldSchema, "type" | "name"> = {
      fieldType: "datetime",
    },
  ) {
    super(state);
  }

  /** Sets the earliest allowed date-time. */
  min(
    value: Date | string,
  ): FieldBuilderWithValue<this, TValue, DateTimeFieldSchema> {
    return this.withState(withMinDate(this.state, value));
  }

  /** Sets the latest allowed date-time. */
  max(
    value: Date | string,
  ): FieldBuilderWithValue<this, TValue, DateTimeFieldSchema> {
    return this.withState(withMaxDate(this.state, value));
  }
}

/** Creates a date-only field. */
export function date(): DateFieldBuilder {
  return new DateFieldBuilder();
}

/** Creates a date-and-time field. */
export function datetime(): DateTimeFieldBuilder {
  return new DateTimeFieldBuilder();
}
