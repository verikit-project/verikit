import assert from "node:assert/strict";
import test from "node:test";
import { action, runAction } from "../../../src/actions/index.js";
import {
  action as packageAction,
  runAction as packageRunAction,
} from "../../../src/index.js";

test("actions barrels expose the builder and execution entrypoints", () => {
  assert.equal(typeof action, "function");
  assert.equal(typeof runAction, "function");
  assert.equal(packageAction, action);
  assert.equal(packageRunAction, runAction);
});

test("ActionState is not part of the public actions barrel", () => {
  // ActionState is raw builder state, not public API.
  // If it is re-exported, this directive stops matching a real error.
  // @ts-expect-error ActionState is intentionally not exported from the barrel.
  type _Check = import("../../../src/index.js").ActionState<
    unknown,
    unknown,
    unknown,
    unknown
  >;
});
