import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, it } from "node:test";
import { scaffold } from "../src/scaffold.js";
import { PACKAGE_ROOT, TEMPLATES_DIR } from "./helpers.js";

it("ships generated files that match `verikit generate:schema`", () => {
  // Inside this package, so the app's resources can import verikit from
  // its devDependencies.
  const app = path.join(PACKAGE_ROOT, ".test-dist", `sync-${process.pid}`);
  after(() => rmSync(app, { recursive: true, force: true }));
  scaffold(path.join(TEMPLATES_DIR, "react-drizzle-sqlite"), app, {
    projectName: "sync-check",
    verikitVersion: "0.0.0",
  });

  // The template depends on the verikit meta-package, whose bin runs the CLI.
  const cli = path.join(
    path.dirname(createRequire(import.meta.url).resolve("verikit")),
    "..",
    "bin",
    "verikit.js",
  );
  const result = spawnSync(
    process.execPath,
    [cli, "generate:schema", "--check"],
    { cwd: app, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Generated files are up to date\./);
});
