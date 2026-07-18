export function messageFrom<TValue>(
  message: string | ((value: TValue) => string) | undefined,
  value: TValue,
): string | undefined {
  return typeof message === "function" ? message(value) : message;
}
