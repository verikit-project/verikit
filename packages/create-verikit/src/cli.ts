import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  detectPackageManager,
  runScriptCommand,
  type PackageManager,
} from "./package-manager.js";
import { isEmptyDirectory, scaffold, validateProjectName } from "./scaffold.js";

export const DEFAULT_PROJECT_NAME = "my-verikit-app";
export const DEFAULT_TEMPLATE = "react-drizzle-sqlite";

export const USAGE = `Usage: npm create verikit@latest [project-name] [--no-install]

Creates a Verikit app (React, Hono, Drizzle, SQLite) in ./<project-name>.

Options:
  --no-install  Skip installing dependencies
  -h, --help    Show this message`;

/** Everything `main` touches outside its own logic, so tests can replace it. */
export interface CliEnvironment {
  argv: string[];
  cwd: string;
  /** `npm_config_user_agent`, used to pick the package manager. */
  userAgent: string | undefined;
  templatesDir: string;
  /** Version of create-verikit, which matches the @verikit/* packages it installs. */
  version: string;
  /** Asks a question; `undefined` when there's no one to ask (no TTY). */
  ask: ((question: string) => Promise<string>) | undefined;
  /** Runs a command with inherited stdio, resolving to its exit code. */
  run: (command: string, args: string[], cwd: string) => Promise<number>;
  log: (message: string) => void;
  error: (message: string) => void;
}

/** Creates an app from the CLI arguments. Resolves to the process exit code. */
export async function main(env: CliEnvironment): Promise<number> {
  let parsed;

  try {
    parsed = parseArgs({
      args: env.argv,
      allowPositionals: true,
      allowNegative: true,
      options: {
        install: { type: "boolean", default: true },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    env.error(`${(error as Error).message}\n\n${USAGE}`);
    return 1;
  }

  const { values, positionals } = parsed;

  if (values.help) {
    env.log(USAGE);
    return 0;
  }

  if (positionals.length > 1) {
    env.error(
      `Expected one project name, got ${positionals.length}.\n\n${USAGE}`,
    );
    return 1;
  }

  const projectName =
    positionals[0] ?? ((await promptForName(env)) || DEFAULT_PROJECT_NAME);
  const invalid = validateProjectName(projectName);

  if (invalid) {
    env.error(invalid);
    return 1;
  }

  const targetDir = path.resolve(env.cwd, projectName);

  if (!isEmptyDirectory(targetDir)) {
    env.error(`${targetDir} already exists and isn't empty.`);
    return 1;
  }

  scaffold(path.join(env.templatesDir, DEFAULT_TEMPLATE), targetDir, {
    projectName,
    verikitVersion: env.version,
  });
  env.log(`Created ${projectName} in ${targetDir}`);

  const pm = detectPackageManager(env.userAgent);
  const install = values.install;
  let installFailed = false;

  if (install) {
    env.log(`\nInstalling dependencies with ${pm}...\n`);
    installFailed = (await env.run(pm, ["install"], targetDir)) !== 0;

    if (installFailed) {
      env.error(
        `\n${pm} install failed. Fix the error above, then run it again.`,
      );
    }
  }

  env.log(nextSteps(projectName, pm, !install || installFailed));

  return installFailed ? 1 : 0;
}

function promptForName(env: CliEnvironment): Promise<string> | string {
  return env.ask
    ? env.ask(`Project name (${DEFAULT_PROJECT_NAME}): `).then((a) => a.trim())
    : "";
}

/** The commands to run after scaffolding. */
export function nextSteps(
  projectName: string,
  pm: PackageManager,
  needsInstall: boolean,
): string {
  const steps = [`cd ${projectName}`];

  if (needsInstall) {
    steps.push(`${pm} install`);
  }

  steps.push(runScriptCommand(pm, "dev"));

  return `\nNext steps:\n\n${steps.map((step) => `  ${step}`).join("\n")}\n\nThen open http://localhost:3000\n`;
}

/** Builds an `ask` that reads one line from `input`, or `undefined` if `input` isn't a TTY. */
export function createAsk(
  input: Readable & { isTTY?: boolean },
  output: Writable,
): CliEnvironment["ask"] {
  if (!input.isTTY) {
    return undefined;
  }

  return async (question) => {
    const rl = createInterface({ input, output });

    try {
      return await rl.question(question);
    } finally {
      rl.close();
    }
  };
}

/** Spawns `command` with inherited stdio. Uses a shell on Windows, where package managers are `.cmd` shims. */
export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  platform: NodeJS.Platform = process.platform,
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: platform === "win32",
    });

    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

/** The real environment, resolved relative to this package's install location. */
export function createEnvironment(packageRoot: string): CliEnvironment {
  const { version } = JSON.parse(
    readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  ) as { version: string };

  return {
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    userAgent: process.env.npm_config_user_agent,
    templatesDir: path.join(packageRoot, "templates"),
    version,
    ask: createAsk(process.stdin, process.stdout),
    run: runCommand,
    log: (message) => console.log(message),
    error: (message) => console.error(message),
  };
}

/** The nearest directory at or above `moduleUrl` that has a package.json. */
export function packageRootFrom(moduleUrl: string): string {
  let dir = path.dirname(fileURLToPath(moduleUrl));

  while (!existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);

    if (parent === dir) {
      throw new Error(`create-verikit: no package.json above ${moduleUrl}`);
    }

    dir = parent;
  }

  return dir;
}
