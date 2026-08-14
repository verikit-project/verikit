import assert from "node:assert/strict";
import test from "node:test";
import { resourceQueryKeys } from "../../src/query/index.js";

test("resourceQueryKeys builds the documented all/list/find shape", () => {
  const keys = resourceQueryKeys("posts");

  assert.deepEqual(keys.all, ["verikit", "posts"]);
  assert.deepEqual(keys.list(), ["verikit", "posts", "list", {}]);
  assert.deepEqual(keys.list({ page: 2 }), [
    "verikit",
    "posts",
    "list",
    { page: 2 },
  ]);
  assert.deepEqual(keys.find("1"), ["verikit", "posts", "find", "1"]);
  assert.deepEqual(keys.relationship("author"), [
    "verikit",
    "posts",
    "relationship",
    "author",
    {},
  ]);
  assert.deepEqual(keys.relationship("author", { page: 2 }), [
    "verikit",
    "posts",
    "relationship",
    "author",
    { page: 2 },
  ]);
});
