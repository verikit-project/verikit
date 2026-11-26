import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { LoadedResource } from "./load-resources.js";
import { moduleFiles } from "./load-resources.js";
import { camelCase, invalidIdentifier, kebabCase } from "./names.js";
import { GENERATED_HEADER } from "./render-schema.js";

/** Source for `resources/index.ts`: every resource, in file order. */
export function renderResourceRegistry(
  resources: readonly LoadedResource[],
): string {
  const imports = new Map<string, string[]>();

  for (const resource of resources) {
    imports.set(resource.file, [
      ...(imports.get(resource.file) ?? []),
      resource.exportName,
    ]);
  }

  const importLines = [...imports]
    .map(
      ([file, names]) => `import { ${names.join(", ")} } from "./${file}";\n`,
    )
    .join("");
  const list = resources.map((resource) => resource.exportName).join(", ");

  return `${GENERATED_HEADER("resources/*.ts")}${importLines}
/** Every resource, in navigation order. */
export const resources = [${list}] as const;

export type ResourceName = (typeof resources)[number]["name"];
`;
}

/** An action file found under `actions/<resource>/`. */
export interface ActionFile {
  resource: string;
  exportName: string;
  /** Path relative to the actions directory, e.g. "post/publish.ts". */
  file: string;
}

/**
 * Finds `actions/<resource-kebab>/<action>.ts` files. Each must export a
 * camelCase const named after its file, which `make:action` writes. Files
 * aren't imported, because action modules may connect to the database.
 */
export function findActions(
  dir: string,
  resources: readonly LoadedResource[],
): ActionFile[] {
  if (!existsSync(dir)) {
    return [];
  }

  const byFolder = new Map(
    resources.map((resource) => [kebabCase(resource.name), resource.name]),
  );
  const found: ActionFile[] = [];

  for (const folder of readdirSync(dir).sort()) {
    if (!statSync(path.join(dir, folder)).isDirectory()) {
      continue;
    }

    const resource = byFolder.get(folder);

    if (!resource) {
      throw new Error(
        `actions/${folder}/ doesn't match a resource. Name action folders after a resource, e.g. actions/${kebabCase(resources[0]?.name ?? "post")}/.`,
      );
    }

    for (const file of moduleFiles(path.join(dir, folder))) {
      const exportName = camelCase(file.slice(0, -".ts".length));
      const invalid = invalidIdentifier(exportName);

      if (invalid) {
        throw new Error(`actions/${folder}/${file}: ${invalid}`);
      }

      found.push({ resource, exportName, file: `${folder}/${file}` });
    }
  }

  return found;
}

/** Source for `actions/index.ts`: each resource's actions for `createServer`. */
export function renderActionRegistry(actions: readonly ActionFile[]): string {
  const alias = (action: ActionFile) =>
    camelCase(`${action.resource} ${action.exportName}`);
  const importLines = actions
    .map(
      (action) =>
        `import { ${action.exportName} as ${alias(action)} } from "./${action.file}";\n`,
    )
    .join("");
  const byResource = new Map<string, string[]>();

  for (const action of actions) {
    byResource.set(action.resource, [
      ...(byResource.get(action.resource) ?? []),
      alias(action),
    ]);
  }

  const entries = [...byResource]
    .map(([resource, names]) => `  ${resource}: [${names.join(", ")}],\n`)
    .join("");

  return `${GENERATED_HEADER("actions/*/*.ts")}import type { ServerResourceConfig } from "@verikit/server";
${importLines}
/** Server-side actions, by resource name. */
export const actions: Partial<
  Record<string, NonNullable<ServerResourceConfig["actions"]>>
> = {
${entries}};
`;
}
