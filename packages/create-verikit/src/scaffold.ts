import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

/** Values substituted for `{{name}}` placeholders in template files. */
export interface TemplateValues {
  projectName: string;
  verikitVersion: string;
}

/**
 * Template files stored under a different name, because npm would otherwise
 * treat them as the template package's own manifest or drop them on publish.
 */
const RENAMED_FILES: Record<string, string> = {
  "_package.json": "package.json",
  _gitignore: ".gitignore",
};

const MAX_NAME_LENGTH = 214;
const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * Returns why `name` can't be used as both a directory and an npm package
 * name, or `undefined` if it can.
 */
export function validateProjectName(name: string): string | undefined {
  if (name.length === 0) {
    return "Project name can't be empty.";
  }

  if (name.length > MAX_NAME_LENGTH) {
    return `Project name must be at most ${MAX_NAME_LENGTH} characters.`;
  }

  if (!NAME_PATTERN.test(name)) {
    return "Project name must start with a lowercase letter or digit and contain only lowercase letters, digits, '.', '_' and '-'.";
  }

  return undefined;
}

/** True when `dir` doesn't exist or has no entries. */
export function isEmptyDirectory(dir: string): boolean {
  return !existsSync(dir) || readdirSync(dir).length === 0;
}

/** Replaces every `{{key}}` in `content` that has a value in `values`. */
export function fillPlaceholders(
  content: string,
  values: TemplateValues,
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? values[key as keyof TemplateValues] : match,
  );
}

/**
 * Copies `templateDir` into `targetDir`, restoring renamed files and filling
 * placeholders. Every template file is text. Returns the created paths,
 * relative to `targetDir`.
 */
export function scaffold(
  templateDir: string,
  targetDir: string,
  values: TemplateValues,
): string[] {
  const created: string[] = [];

  const copyDir = (from: string, to: string) => {
    mkdirSync(to, { recursive: true });

    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const source = path.join(from, entry.name);
      const target = path.join(to, RENAMED_FILES[entry.name] ?? entry.name);

      if (entry.isDirectory()) {
        copyDir(source, target);
        continue;
      }

      writeFileSync(
        target,
        fillPlaceholders(readFileSync(source, "utf8"), values),
      );
      created.push(path.relative(targetDir, target));
    }
  };

  copyDir(templateDir, targetDir);

  return created.sort();
}
