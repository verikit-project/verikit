import { FieldOption, FieldSchema, OptionValue } from "../base.js";

/**
 * Shared schema properties for fields with enumerated options.
 */
export interface OptionFieldSchema<
  TValue extends OptionValue = OptionValue,
> extends FieldSchema {
  options?: readonly FieldOption<TValue>[];
}

/**
 * Converts shorthand option values into serializable option objects.
 */
export function normalizeOptions<TValue extends OptionValue>(
  options: readonly (TValue | FieldOption<TValue>)[],
): FieldOption<TValue>[] {
  return options.map((option) =>
    typeof option === "object" && option !== null && "value" in option
      ? { label: option.label, value: option.value }
      : { label: String(option), value: option as TValue },
  );
}
