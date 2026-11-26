import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const require = createRequire(path.join(ROOT, "package.json"));

const SUBPATHS: [string, string[]][] = [
  ["index", ["@verikit/core", "@verikit/runtime"]],
  ["server", ["@verikit/server"]],
  ["server-testing", ["@verikit/server/testing"]],
  ["client", ["@verikit/client"]],
  ["ui-core", ["@verikit/ui-core"]],
  ["drizzle", ["@verikit/drizzle"]],
  ["prisma", ["@verikit/prisma"]],
  ["react", ["@verikit/react"]],
  ["react-panel", ["@verikit/react-panel"]],
  ["vue", ["@verikit/vue"]],
];

describe("subpath exports", () => {
  for (const [file, packages] of SUBPATHS) {
    it(`${file} re-exports ${packages.join(" and ")}`, async () => {
      const meta = await import(`../src/${file}.js`);
      const expected = new Set<string>();

      for (const name of packages) {
        Object.keys(await import(name)).forEach((key) => expected.add(key));
      }

      assert.deepEqual(Object.keys(meta).sort(), [...expected].sort());
      assert.ok(expected.size > 0);
    });
  }

  it("maps every package.json export to a module", () => {
    const { exports } = JSON.parse(
      readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ) as { exports: Record<string, string | { default: string }> };
    const modules = Object.values(exports)
      .filter((target) => typeof target === "object")
      .map((target) => path.basename(target.default, ".js"))
      .sort();

    assert.deepEqual(modules, SUBPATHS.map(([file]) => file).sort());
  });
});

describe("css entry points", () => {
  it("import files that resolve", () => {
    for (const file of ["theme.css", "react.css", "vue.css"]) {
      const source = readFileSync(path.join(ROOT, "css", file), "utf8");
      const imports = [...source.matchAll(/@import "([^"]+)";/g)].map(
        ([, target]) => target!,
      );

      assert.ok(imports.length > 0, file);
      for (const target of imports) {
        assert.ok(require.resolve(target), `${file}: ${target}`);
      }
    }
  });
});

describe("bin", () => {
  it("runs the verikit CLI", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(ROOT, ".test-dist", "src", "cli.js"), "--help"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: verikit <command>/);
  });
});
