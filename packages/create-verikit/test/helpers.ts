import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after } from "node:test";
import { fileURLToPath } from "node:url";

/** packages/create-verikit, resolved from .test-dist/test/. */
export const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const TEMPLATES_DIR = path.join(PACKAGE_ROOT, "templates");

/** A fresh temp directory, removed after the test file finishes. */
export function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "create-verikit-"));
  after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
