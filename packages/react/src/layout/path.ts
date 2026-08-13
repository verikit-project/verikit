/** Path to a value inside a schema tree form. */
export type SchemaPath = readonly (string | number)[];

/** Reads a nested value by schema path. */
export function getValueAtPath(source: unknown, path: SchemaPath): unknown {
  return path.reduce<unknown>((value, key) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    return (value as Record<string | number, unknown>)[key];
  }, source);
}

/**
 * Reports whether `path` resolves to an own, explicitly present key distinct from `getValueAtPath` returning `undefined`, which is also what a truly absent path returns. Needed to tell "the field was cleared to undefined" apart from "the field was never touched."
 */
export function hasValueAtPath(source: unknown, path: SchemaPath): boolean {
  if (path.length === 0) {
    return true;
  }

  const parent = getValueAtPath(source, path.slice(0, -1));
  const key = path[path.length - 1] as string | number;

  if (parent === null || typeof parent !== "object") {
    return false;
  }

  return Array.isArray(parent)
    ? typeof key === "number" && key >= 0 && key < parent.length
    : Object.hasOwn(parent, key);
}

/** Converts a schema path into the dot-separated key used by form state. */
export function pathKey(path: SchemaPath): string {
  return path.join(".");
}

/**
 * Immutably removes the key at `path`, cloning only the containers along the
 * way (mirroring `setValueAtPath`'s own permissive style for a missing
 * intermediate container, rather than special-casing it). A no-op for an
 * empty path, a non-object source, or a terminal path segment landing on an
 * array  schema-tree field paths always terminate in a field name (a
 * string key on an object), never an array index, since repeater rows are
 * objects with named fields.
 */
export function unsetValueAtPath(source: unknown, path: SchemaPath): unknown {
  if (path.length === 0 || typeof source !== "object" || source === null) {
    return source;
  }

  const [key, ...rest] = path;

  if (rest.length === 0) {
    if (Array.isArray(source)) {
      return source;
    }

    const { [key as string]: _removed, ...remaining } = source as Record<
      string,
      unknown
    >;
    return remaining;
  }

  const container = Array.isArray(source)
    ? [...source]
    : { ...(source as Record<string, unknown>) };

  (container as Record<string | number, unknown>)[key] = unsetValueAtPath(
    (container as Record<string | number, unknown>)[key],
    rest,
  );

  return container;
}

/**
 * Immutably sets `value` at `path`, cloning only the containers along the way.
 */
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
