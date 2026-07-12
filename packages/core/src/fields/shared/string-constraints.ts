import { FieldSchema } from "../base.js";

/**
 * Shared schema properties for string-like fields that support length limits.
 */
export interface StringLengthConstraints extends FieldSchema {
  minLength?: number;
  maxLength?: number;
}

function assertValidLength(name: string, length: number): void {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
}

function assertValidLengthRange(
  state: { minLength?: number; maxLength?: number },
  patch: { minLength?: number; maxLength?: number },
): void {
  const minLength = patch.minLength ?? state.minLength;
  const maxLength = patch.maxLength ?? state.maxLength;

  if (
    minLength !== undefined &&
    maxLength !== undefined &&
    minLength > maxLength
  ) {
    throw new Error("minLength cannot be greater than maxLength.");
  }
}

/**
 * Returns a new field state with a minimum character length.
 */
export function withMinLength<TState extends { minLength?: number }>(
  state: TState,
  minLength: number,
): TState {
  assertValidLength("minLength", minLength);
  assertValidLengthRange(state, { minLength });

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
  assertValidLength("maxLength", maxLength);
  assertValidLengthRange(state, { maxLength });

  return {
    ...state,
    maxLength,
  };
}
