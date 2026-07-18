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

  if (lock.packages?.[""] && lock.packages[""].version !== version) {
    lock.packages[""].version = version;
    changed = true;
  }

  if (changed) {
    writeJson(lockPath, lock);
  }

  return changed;
};

const rootPkg = readJson(path.join(rootDir, "package.json"));

const version = rootPkg.version;
const workspaceFile = path.join(rootDir, "pnpm-workspace.yaml");
const workspacePatterns = fs
  .readFileSync(workspaceFile, "utf8")
  .split("\n")
  .map((line) => line.trim().match(/^- "([^"]+\/\*)"/)?.[1])
  .filter(Boolean);

for (const pattern of workspacePatterns) {
  const workspaceDir = pattern.slice(0, -"/*".length);
  const absoluteWorkspaceDir = path.join(rootDir, workspaceDir);

  if (!fs.existsSync(absoluteWorkspaceDir)) {
    continue;
  }

  for (const name of fs.readdirSync(absoluteWorkspaceDir)) {
    const pkgPath = path.join(absoluteWorkspaceDir, name, "package.json");

    if (!fs.existsSync(pkgPath)) {
      continue;
    }

    const pkg = readJson(pkgPath);

    const packageChanged = pkg.version !== version;

    if (packageChanged) {
      pkg.version = version;
      writeJson(pkgPath, pkg);
    }

    const lockChanged = syncPackageLockVersion(path.dirname(pkgPath), version);

    if (packageChanged || lockChanged) {
      const suffix = lockChanged ? " (package-lock synced)" : "";
      console.log(`${pkg.name} -> ${version}${suffix}`);
    }
  }
}

console.log("Versions synced!");
