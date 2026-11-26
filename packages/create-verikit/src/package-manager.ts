export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Detects which package manager ran `create-verikit` from its
 * `npm_config_user_agent` (for example `"pnpm/11.21.0 npm/? node/v24.18.0"`),
 * defaulting to npm.
 */
export function detectPackageManager(
  userAgent: string | undefined,
): PackageManager {
  const name = userAgent?.split("/")[0];

  return name === "pnpm" || name === "yarn" || name === "bun" ? name : "npm";
}

/** The command a user types to run a package.json script. */
export function runScriptCommand(pm: PackageManager, script: string): string {
  return pm === "npm" || pm === "bun"
    ? `${pm} run ${script}`
    : `${pm} ${script}`;
}
