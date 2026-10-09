/**
 * Formats a record's field value as display text: empty for `null`/`undefined`, the locale string for a `Date`, "Yes"/"No" for a boolean, and `String(value)` otherwise.
 */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
