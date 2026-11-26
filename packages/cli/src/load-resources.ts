import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** The parts of a finalized field schema the generators read. */
export interface FieldInfo {
  fieldType: string;
  required?: boolean;
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  step?: number;
  multiple?: boolean;
  options?: readonly { value: unknown }[];
}

/** The parts of a finalized relationship schema the generators read. */
export interface RelationshipInfo {
  relationshipType: string;
  resource: string;
  foreignKey?: unknown;
}

/** A resource found in the resources directory. */
export interface LoadedResource {
  name: string;
  exportName: string;
  /** File name inside the resources directory, e.g. "blog-post.ts". */
  file: string;
  hasTable: boolean;
  fields: Record<string, FieldInfo>;
  relationships: Record<string, RelationshipInfo>;
}

interface ResourceLike {
  name: string;
  table?: unknown;
  toSchema(): {
    fields: Record<string, FieldInfo>;
    relationships: Record<string, RelationshipInfo>;
  };
}

/** Duck-typed, since the app's copy of @verikit/core isn't this package's. */
function isResource(value: unknown): value is ResourceLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ResourceLike).name === "string" &&
    typeof (value as ResourceLike).toSchema === "function" &&
    typeof (value as { fields?: unknown }).fields === "object"
  );
}

export const REGISTRY_FILE = "index.ts";

/** The `.ts` files in `dir` other than the generated registry, sorted. */
export function moduleFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter(
      (file) =>
        file.endsWith(".ts") &&
        !file.endsWith(".d.ts") &&
        file !== REGISTRY_FILE,
    )
    .sort();
}

let importCount = 0;

/**
 * Imports every resource module in `dir` (Node strips the TypeScript types)
 * and collects the resources they export, sorted by file then export name.
 */
export async function loadResources(dir: string): Promise<LoadedResource[]> {
  const loaded: LoadedResource[] = [];

  for (const file of moduleFiles(dir)) {
    // A fresh query string makes repeated runs in one process re-read the file.
    const url = `${pathToFileURL(path.join(dir, file)).href}?verikit=${importCount++}`;
    let exports: Record<string, unknown>;

    try {
      exports = (await import(url)) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Couldn't load ${path.join(path.basename(dir), file)}: ${(error as Error).message}`,
        { cause: error },
      );
    }

    for (const [exportName, value] of Object.entries(exports).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (!isResource(value)) {
        continue;
      }

      const schema = value.toSchema();

      loaded.push({
        name: value.name,
        exportName,
        file,
        hasTable: value.table !== undefined,
        fields: schema.fields,
        relationships: schema.relationships,
      });
    }
  }

  const byName = new Map<string, LoadedResource>();
  const byExport = new Map<string, LoadedResource>();

  for (const resource of loaded) {
    const sameName = byName.get(resource.name);

    if (sameName) {
      throw new Error(
        `Two resources are named "${resource.name}" (${sameName.file} and ${resource.file}).`,
      );
    }

    const sameExport = byExport.get(resource.exportName);

    if (sameExport) {
      throw new Error(
        `Two files export "${resource.exportName}" (${sameExport.file} and ${resource.file}). Rename one export.`,
      );
    }

    byName.set(resource.name, resource);
    byExport.set(resource.exportName, resource);
  }

  return loaded;
}
