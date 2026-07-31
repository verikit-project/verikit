import { FieldSchema } from "../base.js";

/**
 * Shared schema properties for date-like fields that support range limits.
 */
export interface DateRangeConstraints extends FieldSchema {
  /** Earliest allowed value (inclusive). */
  min?: Date | string;
  /** Latest allowed value (inclusive). */
  max?: Date | string;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function assertValidDate(name: string, value: Date | string): void {
  if (Number.isNaN(toDate(value).getTime())) {
    throw new Error(`${name} must be a valid date.`);
  }
}

function assertValidDateRange(
  state: { min?: Date | string; max?: Date | string },
  patch: { min?: Date | string; max?: Date | string },
): void {
  const min = patch.min ?? state.min;
  const max = patch.max ?? state.max;

  if (min !== undefined && max !== undefined && toDate(min) > toDate(max)) {
    throw new Error("min cannot be later than max.");
  }
}

/**
 * Returns a new field state with the earliest allowed date/time value.
 */
export function withMinDate<TState extends { min?: Date | string }>(
  state: TState,
  min: Date | string,
): TState {
  assertValidDate("min", min);
  assertValidDateRange(state, { min });

  return {
    ...state,
    min,
  };
}

/**
 * Returns a new field state with the latest allowed date/time value.
 */
export function withMaxDate<TState extends { max?: Date | string }>(
  state: TState,
  max: Date | string,
): TState {
  assertValidDate("max", max);
  assertValidDateRange(state, { max });

  return {
    ...state,
    max,
  };
}
