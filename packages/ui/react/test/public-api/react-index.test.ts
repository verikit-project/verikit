import assert from "node:assert/strict";
import test from "node:test";
import type { ReactNode } from "../../src/index.js";

test("react package exposes its public entrypoint", async () => {
  const module = await import("../../src/index.js");
  const node: ReactNode = "Verikit";

  assert.deepEqual(Object.keys(module), []);
  assert.equal(node, "Verikit");
});
