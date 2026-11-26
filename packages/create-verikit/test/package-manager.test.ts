import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectPackageManager,
  runScriptCommand,
} from "../src/package-manager.js";

describe("detectPackageManager", () => {
  it("reads the package manager from the user agent", () => {
    assert.equal(
      detectPackageManager("pnpm/11.21.0 npm/? node/v24.18.0"),
      "pnpm",
    );
    assert.equal(
      detectPackageManager("yarn/4.9.0 npm/? node/v24.18.0"),
      "yarn",
    );
    assert.equal(detectPackageManager("bun/1.3.0 npm/? node/v24.18.0"), "bun");
    assert.equal(detectPackageManager("npm/12.2.1 node/v24.18.0"), "npm");
  });

  it("defaults to npm for a missing or unknown user agent", () => {
    assert.equal(detectPackageManager(undefined), "npm");
    assert.equal(detectPackageManager("deno/2.0.0"), "npm");
  });
});

describe("runScriptCommand", () => {
  it("uses `run` only where the package manager needs it", () => {
    assert.equal(runScriptCommand("npm", "dev"), "npm run dev");
    assert.equal(runScriptCommand("bun", "dev"), "bun run dev");
    assert.equal(runScriptCommand("pnpm", "dev"), "pnpm dev");
    assert.equal(runScriptCommand("yarn", "dev"), "yarn dev");
  });
});
