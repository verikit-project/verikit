import { FieldBuilder, FieldSchema } from "./base.js";

/**
 * Schema describing a date-only field.
 */
export interface DateFieldSchema extends FieldSchema {
  fieldType: "date";
}

/**
 * Schema describing a date-and-time field.
 */
export interface DateTimeFieldSchema extends FieldSchema {
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
}

/**
 * Create a date-only field.
 */
export function date(): DateFieldBuilder {
  return new DateFieldBuilder();
}

/**
 * Create a date-and-time field.
 */
export function datetime(): DateTimeFieldBuilder {
  return new DateTimeFieldBuilder();
}
