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
