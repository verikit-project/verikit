#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const syncPackageLockVersion = (packageDir, version) => {
  const lockPath = path.join(packageDir, "package-lock.json");

  if (!fs.existsSync(lockPath)) {
    return false;
  }

  const lock = readJson(lockPath);
  let changed = false;

  if (lock.version !== undefined && lock.version !== version) {
    lock.version = version;
    changed = true;
  }

  if (lock.packages?.[""]?.version !== undefined) {
    if (lock.packages[""].version !== version) {
      lock.packages[""].version = version;
      changed = true;
    }
  }

  if (changed) {
    writeJson(lockPath, lock);
  }

  return changed;
};

const findPackageJsons = (dir, results = []) => {
  const ignored = new Set([
    ".git",
    "node_modules",
    "dist",
    "coverage",
    ".turbo",
    ".next",
  ]);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const packageJson = path.join(fullPath, "package.json");

      if (fs.existsSync(packageJson)) {
        results.push(packageJson);
      }

      findPackageJsons(fullPath, results);
    }
  }

  return results;
};

const checkOnly = process.argv.includes("--check");

const rootPackagePath = path.join(rootDir, "package.json");
const rootPkg = readJson(rootPackagePath);
const version = rootPkg.version;

const packageJsons = findPackageJsons(rootDir);

if (checkOnly) {
  const mismatched = [];

  for (const packageJsonPath of packageJsons) {
    if (packageJsonPath === rootPackagePath) {
      continue;
    }

    const pkg = readJson(packageJsonPath);

    if (pkg.version !== version) {
      mismatched.push(`${pkg.name}: expected ${version}, found ${pkg.version}`);
    }
  }

  if (mismatched.length > 0) {
    console.error(
      `Versions are out of sync with root package.json (${version}):`,
    );
    for (const line of mismatched) {
      console.error(`  ${line}`);
    }
    console.error("Run `pnpm vsync` to fix.");
    process.exit(1);
  }

  console.log(`Versions are in sync (${version}).`);
  process.exit(0);
}

for (const packageJsonPath of packageJsons) {
  if (packageJsonPath === rootPackagePath) {
    continue;
  }

  const pkg = readJson(packageJsonPath);

  let changed = false;

  if (pkg.version !== version) {
    pkg.version = version;
    changed = true;
  }

  const lockChanged = syncPackageLockVersion(
    path.dirname(packageJsonPath),
    version,
  );

  if (changed) {
    writeJson(packageJsonPath, pkg);
  }

  if (changed || lockChanged) {
    console.log(
      `${pkg.name} -> ${version}${lockChanged ? " (package-lock synced)" : ""}`,
    );
  }
}

console.log("Versions synced!");
