import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { handleList } from "../../src/handlers/list.js";
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
  url: string,
  permissions?: ReturnType<typeof definePermissions<Actor>>,
) {
  const [entry] = buildRouteTable(
    [{ resource: createPostResource(), adapter, permissions }],
    "",
  );
  return {
    entry: entry!,
    actor: { role: "viewer" } as Actor,
    request: new Request(url),
    url: new URL(url),
  };
}

const samplePosts: Post[] = [
  { id: "1", title: "Hello world", body: "first", published: true },
  { id: "2", title: "Second post", body: "hello again", published: false },
];

test("handleList returns all records with pagination meta", async () => {
  const ctx = ctxFor(createInMemoryAdapter(samplePosts), "https://x/post");
  const response = await handleList(ctx);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 2);
  assert.deepEqual(body.meta, { total: 2, page: 1, pageSize: 25 });
});

test("handleList applies the search query param", async () => {
  const ctx = ctxFor(
    createInMemoryAdapter(samplePosts),
    "https://x/post?search=again",
  );
  const body = await (await handleList(ctx)).json();

  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].id, "2");
});

test("handleList is unguarded when no permissions are configured", async () => {
  const ctx = ctxFor(createInMemoryAdapter(samplePosts), "https://x/post");
  const response = await handleList(ctx);
  assert.equal(response.status, 200);
});

test("handleList returns 403 when the actor lacks resource-level read access", async () => {
  const permissions = definePermissions<Actor>().can(
    "read",
    ({ actor }) => actor.role === "admin",
  );
  const ctx = ctxFor(
    createInMemoryAdapter(samplePosts),
    "https://x/post",
    permissions,
  );

  const response = await handleList(ctx);
  assert.equal(response.status, 403);
});

test("handleList redacts fields the actor cannot read from every record", async () => {
  const permissions = definePermissions<Actor>()
    .can("read", true)
    .field("title", { read: true })
    .field("published", { read: true });
  // "body" is left ungated, so it's hidden under fail-closed permissions.
  const ctx = ctxFor(
    createInMemoryAdapter(samplePosts),
    "https://x/post",
    permissions,
  );

  const body = await (await handleList(ctx)).json();
  assert.deepEqual(Object.keys(body.data[0]), ["id", "title", "published"]);
  assert.deepEqual(Object.keys(body.data[1]), ["id", "title", "published"]);
});

test("handleList with a smaller defaultPageSize serves the search route", async () => {
  const manyPosts = Array.from({ length: 15 }, (_, index) => ({
    id: String(index),
    title: `Post ${index}`,
    body: "",
    published: false,
  }));
  const ctx = ctxFor(createInMemoryAdapter(manyPosts), "https://x/post/search");

  const body = await (await handleList(ctx, { defaultPageSize: 10 })).json();
  assert.equal(body.data.length, 10);
  assert.deepEqual(body.meta, { total: 15, page: 1, pageSize: 10 });
});
