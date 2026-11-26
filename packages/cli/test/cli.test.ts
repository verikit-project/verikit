import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { main, USAGE, type CliEnvironment } from "../src/cli.js";
import { PACKAGE_ROOT, PERMISSIONS_FILE, project } from "./helpers.js";

function env(argv: string[], cwd = project()) {
  const result = {
    argv,
    cwd,
    logs: [] as string[],
    errors: [] as string[],
    log: (message: string) => result.logs.push(message),
    error: (message: string) => result.errors.push(message),
  } satisfies CliEnvironment & { logs: string[]; errors: string[] };

  return result;
}

describe("main", () => {
  it("prints usage", async () => {
    const help = env(["--help"]);
    assert.equal(await main(help), 0);
    assert.deepEqual(help.logs, [USAGE]);

    const none = env([]);
    assert.equal(await main(none), 1);
    assert.deepEqual(none.logs, [USAGE]);
  });

  it("reports bad commands, options, and arguments", async () => {
    for (const [argv, message] of [
      [["nope"], /Unknown command "nope"/],
      [["--nope"], /Unknown option '--nope'/],
      [["make:resource"], /Usage: verikit make:resource/],
      [["make:action", "post"], /Usage: verikit make:action/],
      [["generate:schema", "x"], /Usage: verikit generate:schema/],
    ] as const) {
      const run = env([...argv]);
      assert.equal(await main(run), 1, argv.join(" "));
      assert.match(run.errors[0], message);
    }
  });

  it("runs the generators and reports what changed", async () => {
    const root = project({ "server/permissions.ts": PERMISSIONS_FILE });

    const make = env(
      ["make:resource", "post", "title:text", "note:text"],
      root,
    );
    assert.equal(await main(make), 0);
    assert.ok(make.logs.includes("  created  resources/post.ts"));
    assert.ok(make.logs.includes("  updated  server/permissions.ts"));
    assert.match(make.logs.at(-1)!, /open to everyone[\s\S]*db:generate/);
    assert.deepEqual(make.errors, []);

    const action = env(["make:action", "post", "publish", "--force"], root);
    assert.equal(await main(action), 0);
    assert.ok(action.logs.includes("  created  resources/post.actions.ts"));
    assert.ok(action.logs.includes("  created  actions/post/publish.ts"));

    const fresh = env(["generate:schema"], root);
    assert.equal(await main(fresh), 0);
    assert.deepEqual(fresh.logs, ["Generated files are up to date."]);

    const check = env(["generate:schema", "--check"], root);
    assert.equal(await main(check), 0);

    writeFileSync(
      path.join(root, "resources/post.ts"),
      `import { defineResource, text } from "@verikit/core";\nexport const post = defineResource("post", { fields: { note: text() } });\n`,
    );
    const stale = env(["generate:schema", "--check"], root);
    assert.equal(await main(stale), 1);
    assert.match(stale.errors[0], /warning {2}post\.note is optional/);
    assert.match(stale.errors[1], /Out of date: db\/schema\.ts/);

    const regenerate = env(["generate:schema"], root);
    assert.equal(await main(regenerate), 0);
    assert.deepEqual(regenerate.logs.slice(0, 1), ["  updated  db/schema.ts"]);
  });

  it("runs from the real entry point", () => {
    const output = execFileSync(
      process.execPath,
      [path.join(PACKAGE_ROOT, ".test-dist", "src", "index.js"), "--help"],
      { encoding: "utf8" },
    );
    assert.equal(output.trim(), USAGE);

    const failed = spawnSync(
      process.execPath,
      [path.join(PACKAGE_ROOT, ".test-dist", "src", "index.js"), "nope"],
      { encoding: "utf8", cwd: project() },
    );
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /Unknown command "nope"/);
  });
});
