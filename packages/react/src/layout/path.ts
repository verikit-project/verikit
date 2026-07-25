export type SchemaPath = readonly (string | number)[];

export function getValueAtPath(source: unknown, path: SchemaPath): unknown {
  return path.reduce<unknown>((value, key) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    return (value as Record<string | number, unknown>)[key];
  }, source);
}

export function pathKey(path: SchemaPath): string {
  return path.join(".");
}

/** Immutably sets `value` at `path`, cloning only the containers along the way. */
export function setValueAtPath(
  source: unknown,
  path: SchemaPath,
  value: unknown,
): unknown {
  if (path.length === 0) {
    return value;
  }

  const [key, ...rest] = path;
  const container =
    typeof key === "number"
      ? Array.isArray(source)
        ? [...source]
        : []
      : typeof source === "object" && source !== null
        ? { ...(source as Record<string, unknown>) }
        : {};

  (container as Record<string | number, unknown>)[key] = setValueAtPath(
    (container as Record<string | number, unknown>)[key],
    rest,
    value,
  );

  return container;
}
