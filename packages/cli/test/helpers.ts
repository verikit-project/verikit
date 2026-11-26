import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after } from "node:test";
import { fileURLToPath } from "node:url";
import type { LoadedResource } from "../src/load-resources.js";

/** packages/cli, resolved from .test-dist/test/. */
export const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

let count = 0;

/**
 * A fresh app directory inside this package, so its files can import
 * @verikit/core, @verikit/runtime, and drizzle-orm from devDependencies.
 */
export function project(files: Record<string, string> = {}): string {
  const root = path.join(
    PACKAGE_ROOT,
    ".test-dist",
    "projects",
    `${process.pid}-${count++}`,
  );
  mkdirSync(root, { recursive: true });
  after(() => rmSync(root, { recursive: true, force: true }));

  for (const [file, source] of Object.entries({
    "package.json": '{ "type": "module" }',
    ...files,
  })) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), source);
  }

  return root;
}

export const PERMISSIONS_FILE = `import type { ServerResourceConfig } from "@verikit/server";
import type { ResourceName } from "../resources/index.ts";

export const permissions: Record<
  ResourceName,
  ServerResourceConfig["permissions"]
> = {
};
`;

/** A loaded resource built by hand, for exercising generators directly. */
export function loaded(
  name: string,
  fields: LoadedResource["fields"] = {},
  extra: Partial<LoadedResource> = {},
): LoadedResource {
  return {
    name,
    exportName: name,
    file: `${name}.ts`,
    hasTable: false,
    fields,
    relationships: {},
    ...extra,
  };
}
