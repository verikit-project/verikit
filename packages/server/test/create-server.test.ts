import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { action } from "@verikit/runtime";
import { createServer } from "../src/create-server.js";
import {
  createInMemoryAdapter,
  createPostResource,
  type Post,
} from "./fixtures.js";

interface Actor {
  role: "admin" | "viewer";
}

const post: Post = { id: "1", title: "Hello", body: "world", published: false };

test("createServer exposes list/search/create/find/update/delete/action routes", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const publish = action("publish").execute(() => "published");
  const handler = createServer({
    resources: [
      { resource: createPostResource(), adapter, actions: [publish] },
    ],
  });

  const list = await handler(new Request("https://x/post"));
  assert.equal(list.status, 200);
  assert.equal((await list.json()).data.length, 1);

  const search = await handler(new Request("https://x/post/search?q=hello"));
  assert.equal(search.status, 200);
  assert.equal((await search.json()).data.length, 1);

  const create = await handler(
    new Request("https://x/post", {
      method: "POST",
      body: JSON.stringify({ title: "New" }),
    }),
  );
  assert.equal(create.status, 201);

  const find = await handler(new Request("https://x/post/1"));
  assert.equal(find.status, 200);

  const update = await handler(
    new Request("https://x/post/1", {
      method: "PATCH",
      body: JSON.stringify({ published: true }),
    }),
  );
  assert.equal(update.status, 200);
  assert.equal((await update.json()).data.published, true);

  const runAction = await handler(
    new Request("https://x/post/actions/publish", {
      method: "POST",
      body: "{}",
    }),
  );
  assert.equal(runAction.status, 200);
  assert.equal((await runAction.json()).data, "published");

  const del = await handler(
    new Request("https://x/post/1", { method: "DELETE" }),
  );
  assert.equal(del.status, 204);

  const findAfterDelete = await handler(new Request("https://x/post/1"));
  assert.equal(findAfterDelete.status, 404);
});

test("createServer returns 404 for an unmatched path and 405 for a wrong method", async () => {
  const handler = createServer({
    resources: [
      { resource: createPostResource(), adapter: createInMemoryAdapter() },
    ],
  });

  const unmatched = await handler(new Request("https://x/users"));
  assert.equal(unmatched.status, 404);

  const wrongMethod = await handler(
    new Request("https://x/post", { method: "PUT" }),
  );
  assert.equal(wrongMethod.status, 405);

  const badShape = await handler(new Request("https://x/post/1/extra"));
  assert.equal(badShape.status, 404);
});

test("createServer honors a custom path and a basePath prefix together", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        path: "posts",
      },
    ],
    basePath: "/api",
  });

  const response = await handler(new Request("https://x/api/posts/1"));
  assert.equal(response.status, 200);

  const withoutPrefix = await handler(new Request("https://x/posts/1"));
  assert.equal(withoutPrefix.status, 404);
});

test("createServer derives the actor from the context hook and applies permissions", async () => {
  const permissions = definePermissions<Actor>().can(
    "delete",
    ({ actor }) => actor.role === "admin",
  );
  const handler = createServer<Actor>({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        permissions,
      },
    ],
    context: (request) => ({
      role: request.headers.get("x-role") === "admin" ? "admin" : "viewer",
    }),
  });

  const asViewer = await handler(
    new Request("https://x/post/1", { method: "DELETE" }),
  );
  // 404, not 403  a denied actor can't distinguish "doesn't exist" from
  // "exists but I can't delete it" (an existence oracle).
  assert.equal(asViewer.status, 404);

  const asAdmin = await handler(
    new Request("https://x/post/1", {
      method: "DELETE",
      headers: { "x-role": "admin" },
    }),
  );
  assert.equal(asAdmin.status, 204);
});

test("createServer maps an adapter exception to a 500 JSON error envelope", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const throwingAdapter = {
    ...adapter,
    find(): Promise<Post | undefined> {
      throw new Error("connection reset");
    },
  };
  const handler = createServer({
    resources: [{ resource: createPostResource(), adapter: throwingAdapter }],
  });

  const response = await handler(new Request("https://x/post/1"));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(typeof body.error.message, "string");
  // The underlying error message shouldn't leak to the client.
  assert.doesNotMatch(body.error.message, /connection reset/);
});

test("createServer throws at construction time on a duplicate resource route", () => {
  assert.throws(() =>
    createServer({
      resources: [
        { resource: createPostResource(), adapter: createInMemoryAdapter() },
        { resource: createPostResource(), adapter: createInMemoryAdapter() },
      ],
    }),
  );
});

test("createServer routes multiple distinct resources independently", async () => {
  const posts = createInMemoryAdapter([{ ...post }]);
  const pages = createInMemoryAdapter([
    { id: "1", title: "About", body: "", published: true },
  ]);

  const handler = createServer({
    resources: [
      { resource: createPostResource(), adapter: posts, path: "posts" },
      { resource: createPostResource(), adapter: pages, path: "pages" },
    ],
  });

  const postsList = await handler(new Request("https://x/posts"));
  const pagesList = await handler(new Request("https://x/pages"));

  assert.equal((await postsList.json()).data[0].title, "Hello");
  assert.equal((await pagesList.json()).data[0].title, "About");
});
