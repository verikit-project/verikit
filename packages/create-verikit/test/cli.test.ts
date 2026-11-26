import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { describe, it, mock } from "node:test";
import { pathToFileURL } from "node:url";
import {
  createAsk,
  createEnvironment,
  DEFAULT_PROJECT_NAME,
  main,
  nextSteps,
  packageRootFrom,
  runCommand,
  USAGE,
  type CliEnvironment,
} from "../src/cli.js";
import { PACKAGE_ROOT, TEMPLATES_DIR, tempDir } from "./helpers.js";

interface FakeEnvironment extends CliEnvironment {
  logs: string[];
  errors: string[];
  runs: { command: string; args: string[]; cwd: string }[];
}

function fakeEnv(overrides: Partial<CliEnvironment> = {}): FakeEnvironment {
  const env: FakeEnvironment = {
    argv: [],
    cwd: tempDir(),
    userAgent: undefined,
    templatesDir: TEMPLATES_DIR,
    version: "1.2.3",
    ask: undefined,
    run: async (command, args, cwd) => {
      env.runs.push({ command, args, cwd });
      return 0;
    },
    log: (message) => env.logs.push(message),
    error: (message) => env.errors.push(message),
    logs: [],
    errors: [],
    runs: [],
    ...overrides,
  };

  return env;
}

describe("main", () => {
  it("prints usage for --help", async () => {
    const env = fakeEnv({ argv: ["--help"] });

    assert.equal(await main(env), 0);
    assert.deepEqual(env.logs, [USAGE]);
  });

  it("rejects unknown options and extra positionals", async () => {
    const unknown = fakeEnv({ argv: ["--nope"] });
    assert.equal(await main(unknown), 1);
    assert.match(unknown.errors[0], /--nope[\s\S]*Usage:/);

    const extra = fakeEnv({ argv: ["a", "b"] });
    assert.equal(await main(extra), 1);
    assert.match(extra.errors[0], /Expected one project name, got 2/);
  });

  it("scaffolds, installs with the detected package manager, and prints next steps", async () => {
    const env = fakeEnv({ argv: ["shop"], userAgent: "pnpm/11.21.0 node/v24" });
    const target = path.join(env.cwd, "shop");

    assert.equal(await main(env), 0);
    assert.ok(existsSync(path.join(target, "package.json")));
    assert.deepEqual(env.runs, [
      { command: "pnpm", args: ["install"], cwd: target },
    ]);
    assert.equal(env.logs.at(-1), nextSteps("shop", "pnpm", false));
    assert.deepEqual(env.errors, []);
  });

  it("skips installing with --no-install", async () => {
    const env = fakeEnv({ argv: ["shop", "--no-install"] });

    assert.equal(await main(env), 0);
    assert.deepEqual(env.runs, []);
    assert.equal(env.logs.at(-1), nextSteps("shop", "npm", true));
  });

  it("reports a failed install and still prints how to finish", async () => {
    const env = fakeEnv({ argv: ["shop"], run: async () => 1 });

    assert.equal(await main(env), 1);
    assert.match(env.errors[0], /npm install failed/);
    assert.equal(env.logs.at(-1), nextSteps("shop", "npm", true));
  });

  it("asks for a name when none is given", async () => {
    const questions: string[] = [];
    const env = fakeEnv({
      ask: async (question) => {
        questions.push(question);
        return "  asked-name  ";
      },
    });

    assert.equal(await main(env), 0);
    assert.match(questions[0], /Project name/);
    assert.ok(existsSync(path.join(env.cwd, "asked-name", "package.json")));
  });

  it("uses the default name for an empty answer or without a TTY", async () => {
    const answered = fakeEnv({ ask: async () => "" });
    assert.equal(await main(answered), 0);
    assert.ok(existsSync(path.join(answered.cwd, DEFAULT_PROJECT_NAME)));

    const noTty = fakeEnv();
    assert.equal(await main(noTty), 0);
    assert.ok(existsSync(path.join(noTty.cwd, DEFAULT_PROJECT_NAME)));
  });

  it("refuses an invalid name or a non-empty target", async () => {
    const invalid = fakeEnv({ argv: ["Bad Name"] });
    assert.equal(await main(invalid), 1);
    assert.match(invalid.errors[0], /lowercase/);

    const taken = fakeEnv({ argv: ["taken"] });
    await main(fakeEnv({ argv: ["taken", "--no-install"], cwd: taken.cwd }));
    assert.equal(await main(taken), 1);
    assert.match(taken.errors[0], /already exists and isn't empty/);
    assert.deepEqual(taken.runs, []);
  });
});

describe("createAsk", () => {
  it("returns undefined when input isn't a TTY", () => {
    assert.equal(createAsk(new PassThrough(), new PassThrough()), undefined);
  });

  it("reads one answer from a TTY", async () => {
    const input = Object.assign(new PassThrough(), { isTTY: true });
    const output = new PassThrough();
    const ask = createAsk(input, output)!;

    const answer = ask("Name? ");
    input.write("typed\n");

    assert.equal(await answer, "typed");
  });
});

describe("runCommand", () => {
  const cwd = process.cwd();

  it("resolves to the exit code", async () => {
    assert.equal(
      await runCommand(process.execPath, ["-e", "process.exit(3)"], cwd),
      3,
    );
  });

  it("resolves to 1 when the command can't start or is killed", async () => {
    assert.equal(
      await runCommand("create-verikit-no-such-command", [], cwd, "linux"),
      1,
    );
    assert.equal(
      await runCommand(
        process.execPath,
        ["-e", "process.kill(process.pid, 'SIGKILL')"],
        cwd,
      ),
      1,
    );
  });

  it("runs through a shell on Windows", async () => {
    assert.equal(await runCommand("exit", ["4"], cwd, "win32"), 4);
  });
});

describe("createEnvironment", () => {
  it("reads the version and templates from the package root", () => {
    const root = tempDir();
    writeFileSync(path.join(root, "package.json"), '{"version":"9.9.9"}');
    const env = createEnvironment(root);

    assert.equal(env.version, "9.9.9");
    assert.equal(env.templatesDir, path.join(root, "templates"));
    assert.equal(env.run, runCommand);
    assert.equal(env.cwd, process.cwd());

    const log = mock.method(console, "log", () => {});
    const error = mock.method(console, "error", () => {});
    env.log("out");
    env.error("err");
    assert.deepEqual(log.mock.calls[0].arguments, ["out"]);
    assert.deepEqual(error.mock.calls[0].arguments, ["err"]);
    log.mock.restore();
    error.mock.restore();
  });
});

describe("packageRootFrom", () => {
  it("finds the nearest package.json above a module", () => {
    const url = pathToFileURL(
      path.join(PACKAGE_ROOT, ".test-dist", "src", "index.js"),
    ).href;
    assert.equal(packageRootFrom(url), PACKAGE_ROOT);
  });

  it("throws when there's no package.json", () => {
    assert.throws(
      () => packageRootFrom("file:///index.js"),
      /no package\.json/,
    );
  });
});

describe("bin", () => {
  it("prints usage from the real entry point", () => {
    const output = execFileSync(
      process.execPath,
      [path.join(PACKAGE_ROOT, ".test-dist", "src", "index.js"), "--help"],
      { encoding: "utf8" },
    );

    assert.equal(output.trim(), USAGE);
    assert.ok(
      readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8").includes(
        '"bin"',
      ),
    );
  });
});
