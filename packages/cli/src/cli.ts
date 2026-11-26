import { parseArgs } from "node:util";
import { FIELD_TYPES } from "./field-spec.js";
import {
  generate,
  makeAction,
  makeResource,
  readConfig,
  type Report,
} from "./project.js";

export const USAGE = `Usage: verikit <command> [options]

Commands:
  make:resource <Name> [field:type ...]  Create resources/<name>.ts, then regenerate
  make:action <resource> <name>          Declare an action in resources/<resource>.actions.ts,
                                         create its handler in actions/<resource>/<name>.ts
  generate:schema [--check]              Regenerate db/schema.ts, resources/index.ts,
                                         and actions/index.ts from resources/

Field types: ${FIELD_TYPES.filter((type) => type !== "select" && type !== "belongsTo").join(", ")},
  select:<option>,<option>, belongsTo:<resource>
Fields are required; end a field with ? to make it nullable.

Example:
  verikit make:resource Post title:text body:textarea? status:select:draft,published

Options:
  --force       Overwrite an existing file (make:*)
  --check       Fail if generated files are out of date (generate:schema)
  -h, --help    Show this message`;

export interface CliEnvironment {
  argv: string[];
  cwd: string;
  log: (message: string) => void;
  error: (message: string) => void;
}

function printReport(env: CliEnvironment, report: Report): void {
  for (const file of report.created) env.log(`  created  ${file}`);
  for (const file of report.updated) env.log(`  updated  ${file}`);
  for (const warning of report.warnings) env.error(`  warning  ${warning}`);

  if (report.notes.length > 0) {
    env.log(`\n${report.notes.join("\n")}`);
  }
}

function expectArgs(
  positionals: string[],
  min: number,
  max: number,
  usage: string,
): void {
  const count = positionals.length - 1;

  if (count < min || count > max) {
    throw new Error(`Usage: verikit ${usage}`);
  }
}

async function run(env: CliEnvironment): Promise<number> {
  const { values, positionals } = parseArgs({
    args: env.argv,
    allowPositionals: true,
    options: {
      force: { type: "boolean", default: false },
      check: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [command] = positionals;

  if (values.help || command === undefined) {
    env.log(USAGE);
    return values.help ? 0 : 1;
  }

  const config = readConfig(env.cwd);
  const force = values.force;

  switch (command) {
    case "make:resource": {
      expectArgs(
        positionals,
        1,
        Infinity,
        "make:resource <Name> [field:type ...]",
      );
      printReport(
        env,
        await makeResource(config, positionals[1], positionals.slice(2), {
          force,
        }),
      );
      return 0;
    }
    case "make:action": {
      expectArgs(positionals, 2, 2, "make:action <resource> <name>");
      printReport(
        env,
        await makeAction(config, positionals[1], positionals[2], { force }),
      );
      return 0;
    }
    case "generate:schema": {
      expectArgs(positionals, 0, 0, "generate:schema [--check]");
      const report = await generate(config, { check: values.check });
      printReport(env, report);

      if (report.stale.length > 0) {
        env.error(
          `Out of date: ${report.stale.join(", ")}. Run \`verikit generate:schema\` and commit the result.`,
        );
        return 1;
      }

      if (report.created.length + report.updated.length === 0) {
        env.log("Generated files are up to date.");
      }

      return 0;
    }
    default:
      throw new Error(`Unknown command "${command}".\n\n${USAGE}`);
  }
}

/** Runs the CLI. Resolves to the process exit code. */
export async function main(env: CliEnvironment): Promise<number> {
  try {
    return await run(env);
  } catch (error) {
    env.error((error as Error).message);
    return 1;
  }
}
