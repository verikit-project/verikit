#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface PackageJson {
  name?: string;
  version?: string;
  [key: string]: unknown;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

const rootPkg = readJson<PackageJson>(path.join(rootDir, "package.json"));
const version = rootPkg.version;

if (!version) {
  throw new Error("Root package.json is missing a version.");
}

const workspaceFile = path.join(rootDir, "pnpm-workspace.yaml");

const workspacePatterns = fs
  .readFileSync(workspaceFile, "utf8")
  .split("\n")
  .map((line: string) => line.trim().match(/^- "([^"]+\/\*)"/)?.[1])
  .filter((pattern): pattern is string => Boolean(pattern));

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

    const pkg = readJson<PackageJson>(pkgPath);

    if (pkg.version !== version) {
      pkg.version = version;
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      console.log(`✓ ${pkg.name ?? name} -> ${version}`);
    }
  }
}

console.log("Versions synced!");