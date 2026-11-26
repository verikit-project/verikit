import { camelCase, invalidIdentifier } from "./names.js";

export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
  "select",
  "belongsTo",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** One `name:type[:arg][?]` argument to `make:resource`. */
export interface FieldSpec {
  name: string;
  type: FieldType;
  nullable: boolean;
  /** Options for `select`. */
  options?: string[];
  /** Target resource name for `belongsTo`. */
  target?: string;
}

/** Field names the generated table or record already uses. */
const RESERVED_FIELDS = ["id", "revision"];

/** Parses `title:text`, `body:textarea?`, `status:select:draft,published`, or `author:belongsTo:user`. */
export function parseFieldSpec(spec: string): FieldSpec {
  const nullable = spec.endsWith("?");
  const [rawName = "", rawType = "", ...rest] = (
    nullable ? spec.slice(0, -1) : spec
  ).split(":");
  const arg = rest.join(":");
  const name = camelCase(rawName);
  const invalid = invalidIdentifier(name, RESERVED_FIELDS);

  if (invalid) {
    throw new Error(`Field "${spec}": ${invalid}`);
  }

  const type = FIELD_TYPES.find(
    (candidate) => candidate.toLowerCase() === rawType.toLowerCase(),
  );

  if (!type) {
    throw new Error(
      `Field "${spec}": unknown type "${rawType}". Use one of: ${FIELD_TYPES.join(", ")}.`,
    );
  }

  if (type === "select") {
    const options = arg
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    if (options.length === 0) {
      throw new Error(
        `Field "${spec}": list the options, e.g. ${name}:select:draft,published`,
      );
    }

    return { name, type, nullable, options };
  }

  if (type === "belongsTo") {
    const target = camelCase(arg);

    if (!target) {
      throw new Error(
        `Field "${spec}": name the target resource, e.g. ${name}:belongsTo:user`,
      );
    }

    return { name, type, nullable, target };
  }

  if (arg) {
    throw new Error(`Field "${spec}": type "${type}" takes no argument.`);
  }

  return { name, type, nullable };
}

/** Rejects two specs that would produce the same field. */
export function assertUniqueFields(specs: readonly FieldSpec[]): void {
  const seen = new Set<string>();

  for (const spec of specs) {
    const names =
      spec.type === "belongsTo" ? [spec.name, `${spec.name}Id`] : [spec.name];

    for (const name of names) {
      if (seen.has(name)) {
        throw new Error(`Field "${name}" is defined twice.`);
      }

      seen.add(name);
    }
  }
}
