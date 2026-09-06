import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@verikit/client";
import { resourceQueryKeys } from "../../src/index.js";

test("resourceQueryKeys builds the documented all/list/find shape", () => {
  const keys = resourceQueryKeys("posts", "test");

  assert.deepEqual(keys.all, ["verikit", "test", "posts"]);
  assert.deepEqual(keys.list(), ["verikit", "test", "posts", "list", {}]);
  assert.deepEqual(keys.list({ page: 2 }), [
    "verikit",
    "test",
    "posts",
    "list",
    { page: 2 },
  ]);
  assert.deepEqual(keys.find("1"), ["verikit", "test", "posts", "find", "1"]);
  assert.deepEqual(keys.relationship("author"), [
    "verikit",
    "test",
    "posts",
    "relationship",
    "author",
    {},
  ]);
  assert.deepEqual(keys.relationship("author", { page: 2 }), [
    "verikit",
    "test",
    "posts",
    "relationship",
    "author",
    { page: 2 },
  ]);
});

test("client identities isolate all query kinds and remain stable", () => {
  const a = createClient({ baseUrl: "/api" });
  const b = createClient({ baseUrl: "/api" });
  const first = resourceQueryKeys("posts", a);
  const second = resourceQueryKeys("posts", b);
  assert.deepEqual(first.all, resourceQueryKeys("posts", a).all);
  assert.notDeepEqual(first.all, second.all);
  assert.notDeepEqual(first.list(), second.list());
  assert.notDeepEqual(first.find("1"), second.find("1"));
  assert.notDeepEqual(
    first.relationship("author"),
    second.relationship("author"),
  );
});

test("explicit namespaces support deliberate sharing and identity transitions", () => {
  const a = createClient({ baseUrl: "/api", cacheNamespace: "session-a" });
  const same = createClient({ baseUrl: "/api", cacheNamespace: "session-a" });
  const b = createClient({ baseUrl: "/api", cacheNamespace: "session-b" });
  assert.deepEqual(
    resourceQueryKeys("posts", a).all,
    resourceQueryKeys("posts", same).all,
  );
  assert.deepEqual(
    resourceQueryKeys("posts", a).all,
    resourceQueryKeys("posts", "session-a").all,
  );
  assert.notDeepEqual(
    resourceQueryKeys("posts", a).all,
    resourceQueryKeys("posts", b).all,
  );
});

test("custom clients without explicit namespaces are isolated by object identity", () => {
  const a = { resource: createClient({ baseUrl: "/api" }).resource };
  const b = { resource: a.resource };
  assert.deepEqual(
    resourceQueryKeys("posts", a).all,
    resourceQueryKeys("posts", a).all,
  );
  assert.notDeepEqual(
    resourceQueryKeys("posts", a).all,
    resourceQueryKeys("posts", b).all,
  );
});
