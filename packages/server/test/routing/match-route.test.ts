import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveResourceAction,
  splitPath,
  stripPrefix,
} from "../../src/routing/match-route.js";

test("splitPath drops empty segments from leading/trailing/duplicate slashes", () => {
  assert.deepEqual(splitPath("/posts/5/"), ["posts", "5"]);
  assert.deepEqual(splitPath("//api//posts"), ["api", "posts"]);
  assert.deepEqual(splitPath(""), []);
});

test("stripPrefix returns the remaining segments when prefix matches", () => {
  assert.deepEqual(stripPrefix(["posts", "5"], ["posts"]), ["5"]);
  assert.deepEqual(stripPrefix(["posts"], ["posts"]), []);
});

test("stripPrefix returns undefined when prefix doesn't match or is longer", () => {
  assert.equal(stripPrefix(["users", "5"], ["posts"]), undefined);
  assert.equal(stripPrefix(["posts"], ["posts", "5"]), undefined);
});

test("resolveResourceAction matches the root shape to list/create by method", () => {
  assert.deepEqual(resolveResourceAction([], "GET"), {
    status: "matched",
    action: { kind: "list" },
  });
  assert.deepEqual(resolveResourceAction([], "POST"), {
    status: "matched",
    action: { kind: "create" },
  });
  assert.deepEqual(resolveResourceAction([], "PUT"), {
    status: "method-not-allowed",
  });
});

test("resolveResourceAction matches /search to GET only", () => {
  assert.deepEqual(resolveResourceAction(["search"], "GET"), {
    status: "matched",
    action: { kind: "search" },
  });
  assert.deepEqual(resolveResourceAction(["search"], "POST"), {
    status: "method-not-allowed",
  });
});

test("resolveResourceAction matches a single id segment to find/update/delete", () => {
  assert.deepEqual(resolveResourceAction(["5"], "GET"), {
    status: "matched",
    action: { kind: "find", id: "5" },
  });
  assert.deepEqual(resolveResourceAction(["5"], "PATCH"), {
    status: "matched",
    action: { kind: "update", id: "5" },
  });
  assert.deepEqual(resolveResourceAction(["5"], "DELETE"), {
    status: "matched",
    action: { kind: "delete", id: "5" },
  });
  assert.deepEqual(resolveResourceAction(["5"], "POST"), {
    status: "method-not-allowed",
  });
});

test("resolveResourceAction matches /actions/:name to POST only", () => {
  assert.deepEqual(resolveResourceAction(["actions", "publish"], "POST"), {
    status: "matched",
    action: { kind: "action", name: "publish" },
  });
  assert.deepEqual(resolveResourceAction(["actions", "publish"], "GET"), {
    status: "method-not-allowed",
  });
});

test("resolveResourceAction matches relationship pickers to GET only", () => {
  assert.deepEqual(
    resolveResourceAction(["relationships", "organization"], "GET"),
    {
      status: "matched",
      action: { kind: "relationship-picker", relationship: "organization" },
    },
  );
  assert.deepEqual(
    resolveResourceAction(["relationships", "organization"], "POST"),
    { status: "method-not-allowed" },
  );
});

test("resolveResourceAction reports not-found for shapes of 3+ segments", () => {
  assert.deepEqual(resolveResourceAction(["5", "extra"], "GET"), {
    status: "not-found",
  });
  assert.deepEqual(
    resolveResourceAction(["actions", "publish", "extra"], "POST"),
    { status: "not-found" },
  );
});

test('resolveResourceAction treats a lone "search" segment as an id for non-GET methods', () => {
  // The `/search` shape only intercepts GET; a record literally keyed
  // "search" must still be reachable by PATCH/DELETE, the same way a record
  // keyed "actions" falls through to the id branch below.
  assert.deepEqual(resolveResourceAction(["search"], "PATCH"), {
    status: "matched",
    action: { kind: "update", id: "search" },
  });
  assert.deepEqual(resolveResourceAction(["search"], "DELETE"), {
    status: "matched",
    action: { kind: "delete", id: "search" },
  });
});

test('resolveResourceAction treats a lone "actions" segment as an id, not the actions shape', () => {
  // Ids are opaque strings, so a record literally keyed "actions" is valid;
  // the two-segment actions shape only kicks in with a name after it.
  assert.deepEqual(resolveResourceAction(["actions"], "GET"), {
    status: "matched",
    action: { kind: "find", id: "actions" },
  });
  assert.deepEqual(resolveResourceAction(["actions"], "POST"), {
    status: "method-not-allowed",
  });
});
