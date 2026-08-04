/**
 * Returns true for plain object literals (`{}` or `Object.create(null)`), excluding class instances, arrays, Dates, and other built-ins.
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Deep-clones plain objects, arrays, and Dates so builder state never shares mutable references with caller-owned values. Other value types (including class instances) are returned as-is.
 */
export function cloneValue<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as TValue;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as TValue;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]),
    ) as TValue;
  }

  return value;
}
