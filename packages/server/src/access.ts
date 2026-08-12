import type { ResourceAccess } from "@verikit/core";
import type { RouteTableEntry } from "./routing/route-table.js";

/** Resolves and validates a server-only access hook before it reaches storage. */
async function resolve(
  entry: RouteTableEntry,
  actor: unknown,
  hook: ResourceAccess["scope"] | ResourceAccess["onCreate"],
  name: "scope" | "onCreate",
): Promise<Record<string, unknown> | undefined> {
  if (!hook) return undefined;
  const values = await hook({ actor });

  for (const [field, value] of Object.entries(values)) {
    if (!Object.hasOwn(entry.fields, field)) {
      throw new Error(
        `Resource "${entry.config.resource.name}" access.${name} returned unknown field "${field}".`,
      );
    }
    if (value === undefined) {
      throw new Error(
        `Resource "${entry.config.resource.name}" access.${name} returned undefined for "${field}".`,
      );
    }
  }

  return Object.keys(values).length === 0 ? undefined : values;
}

export function resolveScope(entry: RouteTableEntry, actor: unknown) {
  return resolve(entry, actor, entry.config.resource.access?.scope, "scope");
}

export function resolveCreateValues(entry: RouteTableEntry, actor: unknown) {
  return resolve(
    entry,
    actor,
    entry.config.resource.access?.onCreate,
    "onCreate",
  );
}
