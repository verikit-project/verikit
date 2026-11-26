import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  fillPlaceholders,
  isEmptyDirectory,
  scaffold,
  validateProjectName,
} from "../src/scaffold.js";
import { TEMPLATES_DIR, tempDir } from "./helpers.js";

const values = { projectName: "my-app", verikitVersion: "1.2.3" };

describe("validateProjectName", () => {
  it("accepts lowercase npm-safe names", () => {
    for (const name of ["my-app", "app2", "a.b_c-d", "0x"]) {
      assert.equal(validateProjectName(name), undefined, name);
    }
  });

  it("rejects empty, too long, and unsafe names", () => {
    assert.match(validateProjectName("")!, /empty/);
    assert.match(validateProjectName("a".repeat(215))!, /at most 214/);

    for (const name of ["MyApp", "-app", ".app", "my app", "../x", "@s/x"]) {
      assert.match(validateProjectName(name)!, /lowercase/, name);
    }
  });
});

describe("isEmptyDirectory", () => {
  it("is true for a missing or empty directory and false otherwise", () => {
    const dir = tempDir();

    assert.equal(isEmptyDirectory(path.join(dir, "missing")), true);
    assert.equal(isEmptyDirectory(dir), true);

    writeFileSync(path.join(dir, "file"), "");
    assert.equal(isEmptyDirectory(dir), false);
  });
});

describe("fillPlaceholders", () => {
  it("replaces known placeholders and leaves unknown ones", () => {
    assert.equal(
      fillPlaceholders("{{projectName}}@{{verikitVersion}} {{other}}", values),
      "my-app@1.2.3 {{other}}",
    );
  });

  it("doesn't treat inherited properties as placeholders", () => {
    assert.equal(fillPlaceholders("{{toString}}", values), "{{toString}}");
  });
});

describe("scaffold", () => {
  it("copies nested files, restores renamed files, and fills placeholders", () => {
    const template = tempDir();
    const target = path.join(tempDir(), "out");

    mkdirSync(path.join(template, "src"));
    writeFileSync(
      path.join(template, "_package.json"),
      '{"name":"{{projectName}}"}',
    );
    writeFileSync(path.join(template, "_gitignore"), "node_modules/\n");
    writeFileSync(path.join(template, "src", "a.ts"), "// {{verikitVersion}}");

    assert.deepEqual(scaffold(template, target, values), [
      ".gitignore",
      "package.json",
      path.join("src", "a.ts"),
    ]);
    assert.equal(
      readFileSync(path.join(target, "package.json"), "utf8"),
      '{"name":"my-app"}',
    );
    assert.equal(
      readFileSync(path.join(target, "src", "a.ts"), "utf8"),
      "// 1.2.3",
    );
  });

  it("produces a complete app from the bundled template", () => {
    const target = path.join(tempDir(), "app");
    const files = scaffold(
      path.join(TEMPLATES_DIR, "react-drizzle-sqlite"),
      target,
      values,
    );

    for (const file of [
      ".gitignore",
      "package.json",
      "db/migrations/0000_init.sql",
      "server/dev.ts",
      "src/App.tsx",
    ]) {
      assert.ok(files.includes(path.normalize(file)), file);
    }

    for (const file of files) {
      const content = readFileSync(path.join(target, file), "utf8");
      assert.doesNotMatch(
        content,
        /\{\{\w+\}\}/,
        `${file} has an unfilled placeholder`,
      );
    }

    const pkg = JSON.parse(
      readFileSync(path.join(target, "package.json"), "utf8"),
    );
    assert.equal(pkg.name, "my-app");
    assert.equal(pkg.dependencies.verikit, "^1.2.3");
    assert.equal(
      Object.keys(pkg.dependencies).some((name: string) =>
        name.startsWith("@verikit/"),
      ),
      false,
    );
    assert.ok(pkg.scripts.dev);
  });
});
