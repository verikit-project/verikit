#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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
const bumpTypes = new Set(["patch", "minor", "major"]);
const bumpType = process.argv.slice(2).find((arg) => bumpTypes.has(arg));

if (checkOnly && bumpType) {
  console.error("Use either `--check` or a version bump, not both.");
  process.exit(1);
}

const bumpVersion = (currentVersion, type) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);

  if (!match) {
    throw new Error(
      `Cannot apply a ${type} bump to non-standard version ${currentVersion}.`,
    );
  }

  const [major, minor, patch] = match.slice(1).map(Number);

  if (type === "major") {
    return `${major + 1}.0.0`;
  }

  if (type === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
};

const assertCleanWorkingTree = () => {
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim();

  if (status) {
    console.error(
      "Refusing to create a release from a dirty working tree. Commit or stash your changes first.",
    );
    process.exit(1);
  }
};

const assertMainBranch = () => {
  const branch = execFileSync("git", ["branch", "--show-current"], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim();

  if (branch !== "main") {
    console.error(
      `Refusing to create a release from "${branch}". Switch to main first.`,
    );
    process.exit(1);
  }
};

const rootPackagePath = path.join(rootDir, "package.json");
const rootPkg = readJson(rootPackagePath);
const version = bumpType
  ? bumpVersion(rootPkg.version, bumpType)
  : rootPkg.version;
const tagRef = `v${version}`;

if (bumpType) {
  assertCleanWorkingTree();
  assertMainBranch();
}

// A release tag is immutable from this script's perspective. In particular,
// do not create a package-version commit and then leave an existing tag on the
// preceding root-only version bump. That would make Publish check out stale
// package manifests and fail its version-sync check.
if (!checkOnly) {
  try {
    execFileSync(
      "git",
      ["rev-parse", "-q", "--verify", `refs/tags/${tagRef}`],
      {
        cwd: rootDir,
        stdio: "ignore",
      },
    );
    console.error(
      `Refusing to sync ${version}: tag ${tagRef} already exists. Move or delete the tag before running \`pnpm vsync\`.`,
    );
    process.exit(1);
  } catch {
    // The tag has not been created yet, so this release can be synchronized.
  }
}

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

const changedFiles = [];

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

  const lockPath = path.join(
    path.dirname(packageJsonPath),
    "package-lock.json",
  );
  const lockChanged = syncPackageLockVersion(
    path.dirname(packageJsonPath),
    version,
  );

  if (changed) {
    writeJson(packageJsonPath, pkg);
    changedFiles.push(packageJsonPath);
  }

  if (lockChanged) {
    changedFiles.push(lockPath);
  }

  if (changed || lockChanged) {
    console.log(
      `${pkg.name} -> ${version}${lockChanged ? " (package-lock synced)" : ""}`,
    );
  }
}

// Update root last so all package manifests are synchronized before the root
// version becomes the release target.
if (bumpType) {
  rootPkg.version = version;
  writeJson(rootPackagePath, rootPkg);
  changedFiles.push(rootPackagePath);
  console.log(`Root version -> ${version}`);
}

if (!bumpType) {
  console.log("Versions synced.");
  process.exit(0);
}

if (changedFiles.length === 0) {
  console.error("No version changes were made; refusing to create a release.");
  process.exit(1);
}

// Keep the "vX.Y.Z" tag and the commit that actually syncs every package to
// that version inseparable, so a tag can never point at a commit where
// packages/*/package.json still lag the root version (see the v0.23.3
// incident: the tag landed on the root-only bump, one commit before sync).
const git = (args) =>
  execFileSync("git", args, { cwd: rootDir, stdio: "inherit" });

if (changedFiles.length > 0) {
  git([
    "commit",
    "-m",
    `chore: version release ${tagRef}`,
    "--",
    ...changedFiles,
  ]);
  console.log(`Committed: chore: version release ${tagRef}`);
}

git(["tag", "-a", tagRef, "-m", version]);
console.log(`Tagged HEAD as ${tagRef}.`);

console.log(
  `Run \`git push && git push origin ${tagRef}\` to publish the release.`,
);
