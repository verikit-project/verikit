import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assertUniqueFields, parseFieldSpec } from "./field-spec.js";
import { loadResources, REGISTRY_FILE } from "./load-resources.js";
import { camelCase, invalidIdentifier, kebabCase } from "./names.js";
import {
  findActions,
  renderActionRegistry,
  renderResourceRegistry,
} from "./render-registry.js";
import {
  renderAction,
  renderResource,
  type RelationTarget,
} from "./render-resource.js";
import { renderSchema, type Dialect } from "./render-schema.js";

/** Where an app keeps the files the generators read and write. */
export interface ProjectConfig {
  root: string;
  dialect: Dialect;
  resourcesDir: string;
  actionsDir: string;
  schemaFile: string;
  permissionsFile: string;
}

const DEFAULTS = {
  dialect: "sqlite",
  resources: "resources",
  actions: "actions",
  schema: "db/schema.ts",
  permissions: "server/permissions.ts",
};

/** Reads the optional `"verikit"` key of `root/package.json`. */
export function readConfig(root: string): ProjectConfig {
  const packageJson = path.join(root, "package.json");
  const raw = existsSync(packageJson)
    ? ((JSON.parse(readFileSync(packageJson, "utf8")) as { verikit?: unknown })
        .verikit ?? {})
    : {};
  const config = { ...DEFAULTS, ...(raw as Partial<typeof DEFAULTS>) };

  if (config.dialect !== "sqlite" && config.dialect !== "postgresql") {
    throw new Error(
      `package.json "verikit.dialect" must be "sqlite" or "postgresql", not ${JSON.stringify(config.dialect)}.`,
    );
  }

  return {
    root,
    dialect: config.dialect,
    resourcesDir: path.resolve(root, config.resources),
    actionsDir: path.resolve(root, config.actions),
    schemaFile: path.resolve(root, config.schema),
    permissionsFile: path.resolve(root, config.permissions),
  };
}

/** What a command changed, for the CLI to report. */
export interface Report {
  created: string[];
  updated: string[];
  stale: string[];
  warnings: string[];
  notes: string[];
}

function emptyReport(): Report {
  return { created: [], updated: [], stale: [], warnings: [], notes: [] };
}

/** Ignores formatting, so running Prettier on generated files isn't drift. */
function normalize(source: string): string {
  return source.replace(/\s+/g, "").replace(/,([\]})>])/g, "$1");
}

function relative(config: ProjectConfig, file: string): string {
  return path.relative(config.root, file).split(path.sep).join("/");
}

/**
 * Regenerates the resource registry, action registry, and Drizzle schema from
 * the resources directory. With `check`, reports out-of-date files instead.
 */
export async function generate(
  config: ProjectConfig,
  { check = false }: { check?: boolean } = {},
  report: Report = emptyReport(),
): Promise<Report> {
  const resources = await loadResources(config.resourcesDir);
  const customSchema = path.join(
    path.dirname(config.schemaFile),
    "custom-schema.ts",
  );
  const schema = renderSchema(resources, config.dialect, {
    customSchema: existsSync(customSchema) ? "custom-schema.ts" : undefined,
  });
  const files: [string, string][] = [
    [
      path.join(config.resourcesDir, REGISTRY_FILE),
      renderResourceRegistry(resources),
    ],
    [
      path.join(config.actionsDir, REGISTRY_FILE),
      renderActionRegistry(findActions(config.actionsDir, resources)),
    ],
    [config.schemaFile, schema.source],
  ];

  report.warnings.push(...schema.warnings);

  for (const [file, source] of files) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;

    if (current !== undefined && normalize(current) === normalize(source)) {
      continue;
    }

    if (check) {
      report.stale.push(relative(config, file));
      continue;
    }

    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, source);
    (current === undefined ? report.created : report.updated).push(
      relative(config, file),
    );

    if (file === config.schemaFile) {
      report.notes.push(
        "The database schema changed: run `npm run db:generate` to create a migration.",
      );
    }
  }

  return report;
}

function writeNewFile(
  config: ProjectConfig,
  file: string,
  source: string,
  force: boolean,
  report: Report,
): void {
  const exists = existsSync(file);

  if (exists && !force) {
    throw new Error(
      `${relative(config, file)} already exists. Pass --force to overwrite it.`,
    );
  }

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, source);
  (exists ? report.updated : report.created).push(relative(config, file));
}

/** Adds `name: "open"` to the `permissions` map, if the file has one. */
export function addOpenPermission(file: string, name: string): boolean {
  if (!existsSync(file)) {
    return false;
  }

  const source = readFileSync(file, "utf8");

  if (new RegExp(`^\\s+${name}:`, "m").test(source)) {
    return true;
  }

  const opening = /export const permissions\b[^=]*=\s*\{\n/.exec(source);

  if (!opening) {
    return false;
  }

  const at = opening.index + opening[0].length;
  writeFileSync(
    file,
    `${source.slice(0, at)}  ${name}: "open",\n${source.slice(at)}`,
  );
  return true;
}

/** `make:resource <Name> [field:type ...]`. */
export async function makeResource(
  config: ProjectConfig,
  rawName: string,
  fieldArgs: readonly string[],
  { force = false }: { force?: boolean } = {},
): Promise<Report> {
  const name = camelCase(rawName);
  const invalid = invalidIdentifier(name, ["resources", "tables", "actions"]);

  if (invalid) {
    throw new Error(`Resource name ${invalid}`);
  }

  const specs = fieldArgs.map(parseFieldSpec);
  assertUniqueFields(specs);

  const targets: Record<string, RelationTarget> = {};
  const external = specs.filter(
    (spec) => spec.type === "belongsTo" && spec.target !== name,
  );
  const existing =
    external.length > 0 ? await loadResources(config.resourcesDir) : [];

  for (const spec of external) {
    const target = existing.find((resource) => resource.name === spec.target);

    if (!target) {
      throw new Error(
        `Field "${spec.name}" belongs to "${spec.target}", which doesn't exist yet. Create it first: verikit make:resource ${spec.target}`,
      );
    }

    targets[target.name] = {
      exportName: target.exportName,
      file: target.file,
      displayField: Object.entries(target.fields).find(
        ([, field]) =>
          field.fieldType === "text" || field.fieldType === "email",
      )?.[0],
    };
  }

  const report = emptyReport();
  writeNewFile(
    config,
    path.join(config.resourcesDir, `${kebabCase(name)}.ts`),
    renderResource(name, specs, targets),
    force,
    report,
  );

  if (addOpenPermission(config.permissionsFile, name)) {
    report.updated.push(relative(config, config.permissionsFile));
    report.notes.push(
      `"${name}" is open to everyone. Restrict it in ${relative(config, config.permissionsFile)}.`,
    );
  } else {
    report.notes.push(
      `Add "${name}" to the permissions passed to createServer, e.g. permissions: "open".`,
    );
  }

  return generate(config, {}, report);
}

/** `make:action <resource> <name>`. */
export async function makeAction(
  config: ProjectConfig,
  resourceArg: string,
  rawName: string,
  { force = false }: { force?: boolean } = {},
): Promise<Report> {
  const resources = await loadResources(config.resourcesDir);
  const wanted = camelCase(resourceArg);
  const resource = resources.find(
    (candidate) => candidate.name === wanted || candidate.exportName === wanted,
  );

  if (!resource) {
    const known = resources.map((candidate) => candidate.name).join(", ");
    throw new Error(
      `No resource named "${resourceArg}". Known resources: ${known || "none"}.`,
    );
  }

  const name = camelCase(rawName);
  const invalid = invalidIdentifier(name);

  if (invalid) {
    throw new Error(`Action name ${invalid}`);
  }

  const report = emptyReport();
  writeNewFile(
    config,
    path.join(
      config.actionsDir,
      kebabCase(resource.name),
      `${kebabCase(name)}.ts`,
    ),
    renderAction(resource.name, name),
    force,
    report,
  );

  return generate(config, {}, report);
}
