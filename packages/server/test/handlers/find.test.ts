import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { handleFind } from "../../src/handlers/find.js";
import { buildRouteTable } from "../../src/routing/route-table.js";
import {
  createInMemoryAdapter,
  createPostResource,
  type Post,
} from "../fixtures.js";

interface Actor {
  role: "admin" | "viewer";
}

function ctxFor(
  adapter: ReturnType<typeof createInMemoryAdapter>,
  permissions?: ReturnType<typeof definePermissions<Actor>>,
) {
  const [entry] = buildRouteTable(
    [{ resource: createPostResource(), adapter, permissions }],
    "",
  );
  return {
    entry: entry!,
    actor: { role: "viewer" } as Actor,
    request: new Request("https://x/post/1"),
    url: new URL("https://x/post/1"),
  };
}

const post: Post = { id: "1", title: "Hello", body: "world", published: true };

test("handleFind returns the record when it exists", async () => {
  const ctx = ctxFor(createInMemoryAdapter([post]));
  const response = await handleFind(ctx, "1");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: post });
});

test("handleFind returns 404 for a missing record", async () => {
  const ctx = ctxFor(createInMemoryAdapter([post]));
  const response = await handleFind(ctx, "missing");
  assert.equal(response.status, 404);
});

test("handleFind returns 403 when the actor lacks read access to the record", async () => {
  const permissions = definePermissions<Actor>().can(
    "read",
    ({ actor }) => actor.role === "admin",
  );
  const ctx = ctxFor(createInMemoryAdapter([post]), permissions);

  const response = await handleFind(ctx, "1");
  assert.equal(response.status, 403);
});

test("handleFind redacts fields the actor cannot read", async () => {
  const permissions = definePermissions<Actor>()
    .can("read", true)
    .field("title", { read: true });
  const ctx = ctxFor(createInMemoryAdapter([post]), permissions);

  const body = await (await handleFind(ctx, "1")).json();
  assert.deepEqual(body.data, { id: "1", title: "Hello" });
});
