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
