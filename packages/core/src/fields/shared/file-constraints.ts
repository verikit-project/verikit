import { FieldSchema } from "../base.js";

/**
 * Shared schema properties for upload fields.
 */
export interface FileConstraints extends FieldSchema {
  accept?: readonly string[];
  maxSize?: number;
  multiple?: boolean;
}

/**
 * Returns a new field state with accepted MIME types or extensions.
 */
export function withAccept<TState extends { accept?: readonly string[] }>(
  state: TState,
  accept: readonly string[],
): TState {
  return {
    ...state,
    accept,
  };
}

/**
 * Returns a new field state with a maximum upload size in bytes.
 */
export function withMaxSize<TState extends { maxSize?: number }>(
  state: TState,
  maxSize: number,
): TState {
  return {
    ...state,
    maxSize,
  };
}

/**
 * Returns a new field state with single or multiple upload behavior.
 */
export function withMultiple<TState extends { multiple?: boolean }>(
  state: TState,
  multiple: boolean,
): TState {
  return {
    ...state,
    multiple,
  };
}
