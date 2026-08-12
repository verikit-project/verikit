#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const packagesDir = path.join(rootDir, "packages");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

/**
 * Every path an `exports`/`main`/`types` field can reference, resolved relative to the
 * package directory. Handles both a bare string target and a conditions object
 * (`{ types, default, ... }`); doesn't need to handle subpath patterns (`./*`) since no
 * package in this workspace uses one.
 */
function collectDeclaredEntryPaths(pkg) {
  const targets = [];

  if (typeof pkg.main === "string") targets.push(pkg.main);
  if (typeof pkg.types === "string") targets.push(pkg.types);

  for (const value of Object.values(pkg.exports ?? {})) {
    if (typeof value === "string") {
      targets.push(value);
    } else if (value && typeof value === "object") {
      for (const conditionTarget of Object.values(value)) {
        if (typeof conditionTarget === "string") targets.push(conditionTarget);
      }
    }
  }

  return [...new Set(targets)].map((target) => target.replace(/^\.\//, ""));
}

/** The exact file list `npm publish` would ship, honoring `files`/`.npmignore`. */
function packedFileList(packageDir) {
  const output = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--silent"],
    { cwd: packageDir, encoding: "utf8" },
  );
  const [entry] = JSON.parse(output);
  return new Set(entry.files.map((f) => f.path));
}

let failed = false;

for (const name of fs.readdirSync(packagesDir).sort()) {
  const packageDir = path.join(packagesDir, name);
  const packageJsonPath = path.join(packageDir, "package.json");

  if (!fs.existsSync(packageJsonPath)) continue;

  const pkg = readJson(packageJsonPath);
  if (pkg.private) continue;

  console.log(`\n== ${pkg.name} ==`);

  const packed = packedFileList(packageDir);
  const declared = collectDeclaredEntryPaths(pkg);

  for (const entryPath of declared) {
    const matches = entryPath.includes("*")
      ? [...packed].some((packedPath) =>
          new RegExp(
            `^${entryPath
              .split("*")
              .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              .join(".*")}$`,
          ).test(packedPath),
        )
      : packed.has(entryPath);

    if (!matches) {
      console.error(
        `  ✗ ${entryPath} is referenced by package.json but would not be published ` +
          `(missing from \`files\`, or not built)`,
      );
      failed = true;
    }
  }

  // Theme ships only CSS assets (no JS entry point)  the packed-file check above already
  // covers it; there's nothing importable to smoke-test at runtime.
  if (!pkg.main && !pkg.exports) continue;

  const entryTarget =
    pkg.main ??
    Object.values(pkg.exports)[0]?.default ??
    Object.values(pkg.exports)[0];
  if (typeof entryTarget !== "string" || !entryTarget.endsWith(".js")) continue;

  const entryUrl = pathToFileURL(path.join(packageDir, entryTarget)).href;

  try {
    const mod = await import(entryUrl);
    const exportCount = Object.keys(mod).length;

    if (exportCount === 0) {
      console.error(`  ✗ imported successfully but exposed zero exports`);
      failed = true;
    } else {
      console.log(`  ✔ imports cleanly, ${exportCount} export(s)`);
    }
  } catch (error) {
    console.error(`  ✗ failed to import: ${error.message}`);
    failed = true;
  }
}

if (failed) {
  console.error("\nsmoke-test: FAILED");
  process.exit(1);
}

console.log("\nsmoke-test: all published packages import cleanly");
