import { FieldSchema } from "../base.js";

/**
 * Shared schema properties for string-like fields that support length limits.
 */
export interface StringLengthConstraints extends FieldSchema {
  minLength?: number;
  maxLength?: number;
}

/**
 * Returns a new field state with a minimum character length.
 */
export function withMinLength<TState extends { minLength?: number }>(
  state: TState,
  minLength: number,
): TState {
  return {
    ...state,
    minLength,
  };
}

/**
 * Returns a new field state with a maximum character length.
 */
export function withMaxLength<TState extends { maxLength?: number }>(
  state: TState,
  maxLength: number,
): TState {
  return {
    ...state,
    maxLength,
  };
}
