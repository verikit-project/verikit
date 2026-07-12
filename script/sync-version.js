#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

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

    if (pkg.version !== version) {
      pkg.version = version;
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      console.log(`✓ ${pkg.name} -> ${version}`);
    }
  }
}

console.log("Versions synced!");
