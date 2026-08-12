import assert from "node:assert/strict";
import test from "node:test";
import {
  definePermissions,
  defineResource,
  text,
  textarea,
  boolean,
} from "@verikit/core";
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
      {
        resource: createPostResource(),
        adapter,
        actions: [publish],
        permissions: "open",
      },
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

test("actor-aware scopes isolate every storage operation and own create values", async () => {
  const resource = defineResource("project", {
    fields: {
      title: text().required().searchable(),
      body: textarea(),
      published: boolean().default(false),
      organizationId: text().required(),
    },
    access: {
      scope: ({ actor }) => ({
        organizationId: (actor as { organizationId: string }).organizationId,
      }),
      onCreate: ({ actor }) => ({
        organizationId: (actor as { organizationId: string }).organizationId,
      }),
    },
  });
  const adapter = createInMemoryAdapter([
    { ...post, id: "mine", organizationId: "org-a" },
    { ...post, id: "theirs", organizationId: "org-b" },
  ]);
  const inspect = action("inspect").execute(({ record }) => record);
  const handler = createServer({
    resources: [{ resource, adapter, actions: [inspect], permissions: "open" }],
    context: () => ({ organizationId: "org-a" }),
  });

  const list = await handler(new Request("https://x/project"));
  const listed = await list.json();
  assert.deepEqual(
    listed.data.map((record: Post) => record.id),
    ["mine"],
  );
  assert.equal(listed.meta.total, 1);

  assert.equal(
    (await handler(new Request("https://x/project/theirs"))).status,
    404,
  );
  assert.equal(
    (
      await handler(
        new Request("https://x/project/theirs", {
          method: "PATCH",
          body: JSON.stringify({ title: "stolen" }),
        }),
      )
    ).status,
    404,
  );

  const updated = await handler(
    new Request("https://x/project/mine", {
      method: "PATCH",
      body: JSON.stringify({ title: "still mine", organizationId: "org-b" }),
    }),
  );
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).data.organizationId, "org-a");

  assert.equal(
    (
      await handler(
        new Request("https://x/project/theirs", { method: "DELETE" }),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await handler(
        new Request("https://x/project/actions/inspect", {
          method: "POST",
          body: JSON.stringify({ recordId: "theirs" }),
        }),
      )
    ).status,
    404,
  );

  const created = await handler(
    new Request("https://x/project", {
      method: "POST",
      body: JSON.stringify({ title: "new", organizationId: "org-b" }),
    }),
  );
  assert.equal(created.status, 201);
  assert.equal((await created.json()).data.organizationId, "org-a");
});

test("createServer returns 404 for an unmatched path and 405 for a wrong method", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
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

test("createServer leaves OPTIONS unsupported unless cors is configured", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
    ],
  });

  const response = await handler(
    new Request("https://x/post", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.example",
        "access-control-request-method": "POST",
      },
    }),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("createServer handles configured CORS preflight requests", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
    ],
    cors: {
      origin: "https://app.example",
      credentials: true,
      maxAge: 600,
    },
  });

  const response = await handler(
    new Request("https://x/post/actions/publish", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization, content-type",
      },
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://app.example",
  );
  assert.equal(
    response.headers.get("access-control-allow-methods"),
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  assert.equal(
    response.headers.get("access-control-allow-headers"),
    "authorization, content-type",
  );
  assert.equal(
    response.headers.get("access-control-allow-credentials"),
    "true",
  );
  assert.equal(response.headers.get("access-control-max-age"), "600");
  assert.equal(response.headers.get("vary"), "Origin");
});

test("createServer uses configured CORS allowed headers on preflight", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
    ],
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["authorization", "content-type"],
    },
  });

  const response = await handler(
    new Request("https://x/post", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "x-ignored",
      },
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(
    response.headers.get("access-control-allow-methods"),
    "GET, POST",
  );
  assert.equal(
    response.headers.get("access-control-allow-headers"),
    "authorization, content-type",
  );
  assert.equal(response.headers.get("vary"), null);
});

test("createServer preflight defaults to GET and Content-Type when request hints are absent", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
    ],
    cors: { origin: "*" },
  });

  const response = await handler(
    new Request("https://x/post", {
      method: "OPTIONS",
      headers: { origin: "https://app.example" },
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-headers"),
    "Content-Type",
  );
});

test("createServer adds configured CORS headers to matching normal responses", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        permissions: "open",
      },
    ],
    cors: {
      origin: ["https://app.example"],
      exposedHeaders: ["x-request-id"],
    },
  });

  const response = await handler(
    new Request("https://x/post", {
      headers: { origin: "https://app.example" },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://app.example",
  );
  assert.equal(
    response.headers.get("access-control-expose-headers"),
    "x-request-id",
  );
});

test("createServer supports predicate CORS origins", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        permissions: "open",
      },
    ],
    cors: {
      origin: (origin) => origin.endsWith(".example"),
    },
  });

  const allowed = await handler(
    new Request("https://x/post", {
      headers: { origin: "https://app.example" },
    }),
  );
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "https://app.example",
  );

  const denied = await handler(
    new Request("https://x/post", {
      headers: { origin: "https://app.invalid" },
    }),
  );
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});

test("createServer omits CORS headers when the request has no origin", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        permissions: "open",
      },
    ],
    cors: { origin: "*" },
  });

  const response = await handler(new Request("https://x/post"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("createServer omits CORS headers for disallowed origins", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        permissions: "open",
      },
    ],
    cors: { origin: "https://app.example" },
  });

  const response = await handler(
    new Request("https://x/post", {
      headers: { origin: "https://evil.example" },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("createServer omits CORS headers for origins outside an allowed origin list", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        permissions: "open",
      },
    ],
    cors: { origin: ["https://app.example"] },
  });

  const response = await handler(
    new Request("https://x/post", {
      headers: { origin: "https://other.example" },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("createServer does not execute a disallowed CORS preflight as a resource request", async () => {
  const adapter = createInMemoryAdapter();
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter,
        permissions: "open",
      },
    ],
    cors: { origin: "https://app.example" },
  });

  const response = await handler(
    new Request("https://x/post", {
      method: "OPTIONS",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "POST",
      },
    }),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(adapter.records.length, 0);
});

test("createServer validates unsafe CORS options at construction time", () => {
  assert.throws(
    () =>
      createServer({
        resources: [
          {
            resource: createPostResource(),
            adapter: createInMemoryAdapter(),
            permissions: "open",
          },
        ],
        cors: { origin: "*", credentials: true },
      }),
    /cors\.credentials/,
  );
  assert.throws(
    () =>
      createServer({
        resources: [
          {
            resource: createPostResource(),
            adapter: createInMemoryAdapter(),
            permissions: "open",
          },
        ],
        cors: { origin: "https://app.example", maxAge: -1 },
      }),
    /cors\.maxAge/,
  );
});

test("createServer honors a custom path and a basePath prefix together", async () => {
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        path: "posts",
        permissions: "open",
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
    resources: [
      {
        resource: createPostResource(),
        adapter: throwingAdapter,
        permissions: "open",
      },
    ],
  });

  const response = await handler(new Request("https://x/post/1"));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(typeof body.error.message, "string");
  // The underlying error message shouldn't leak to the client.
  assert.doesNotMatch(body.error.message, /connection reset/);
});

test("createServer's onError hook observes the underlying error, request, and resolved route", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const throwingAdapter = {
    ...adapter,
    find(): Promise<Post | undefined> {
      throw new Error("connection reset");
    },
  };
  const observed: unknown[] = [];
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: throwingAdapter,
        permissions: "open",
      },
    ],
    onError: (error, request, route) => {
      observed.push({ error, url: request.url, route });
    },
  });

  const response = await handler(new Request("https://x/post/1"));
  assert.equal(response.status, 500);
  assert.equal(observed.length, 1);
  assert.deepEqual(observed[0], {
    error: new Error("connection reset"),
    url: "https://x/post/1",
    route: { resource: "post", action: { kind: "find", id: "1" } },
  });
});

test("createServer still returns the 500 envelope when onError itself throws", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const throwingAdapter = {
    ...adapter,
    find(): Promise<Post | undefined> {
      throw new Error("connection reset");
    },
  };
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: throwingAdapter,
        permissions: "open",
      },
    ],
    onError: () => {
      throw new Error("logger is down");
    },
  });

  const response = await handler(new Request("https://x/post/1"));
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(typeof body.error.message, "string");
});

test("createServer maps a throwing context hook to the same 500 envelope and onError as a handler/adapter exception", async () => {
  const observed: unknown[] = [];
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter([{ ...post }]),
        permissions: "open",
      },
    ],
    context: () => {
      throw new Error("session lookup failed");
    },
    onError: (error, request, route) => {
      observed.push({ error, url: request.url, route });
    },
  });

  const response = await handler(new Request("https://x/post/1"));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(typeof body.error.message, "string");
  assert.doesNotMatch(body.error.message, /session lookup failed/);
  assert.equal(observed.length, 1);
  assert.deepEqual(observed[0], {
    error: new Error("session lookup failed"),
    url: "https://x/post/1",
    route: { resource: "post", action: { kind: "find", id: "1" } },
  });
});

test("createServer rejects oversized create, update, and action bodies with 413", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const publish = action("publish").execute(() => "published");
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter,
        actions: [publish],
        permissions: "open",
      },
    ],
    maxBodyBytes: 8,
  });

  const create = await handler(
    new Request("https://x/post", {
      method: "POST",
      body: JSON.stringify({ title: "Too large" }),
    }),
  );
  assert.equal(create.status, 413);

  const update = await handler(
    new Request("https://x/post/1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Too large" }),
    }),
  );
  assert.equal(update.status, 413);

  const runAction = await handler(
    new Request("https://x/post/actions/publish", {
      method: "POST",
      body: JSON.stringify({ input: { note: "Too large" } }),
    }),
  );
  assert.equal(runAction.status, 413);
});

test("createServer allows oversized bodies when maxBodyBytes is false", async () => {
  const adapter = createInMemoryAdapter();
  const handler = createServer({
    resources: [
      {
        resource: createPostResource(),
        adapter,
        permissions: "open",
      },
    ],
    maxBodyBytes: false,
  });

  const response = await handler(
    new Request("https://x/post", {
      method: "POST",
      body: JSON.stringify({ title: "A body larger than eight bytes" }),
    }),
  );

  assert.equal(response.status, 201);
});

test("createServer validates maxBodyBytes at construction time", () => {
  assert.throws(
    () =>
      createServer({
        resources: [
          {
            resource: createPostResource(),
            adapter: createInMemoryAdapter(),
            permissions: "open",
          },
        ],
        maxBodyBytes: 0,
      }),
    /maxBodyBytes/,
  );
});

test("createServer throws at construction time on a duplicate resource route", () => {
  assert.throws(() =>
    createServer({
      resources: [
        {
          resource: createPostResource(),
          adapter: createInMemoryAdapter(),
          permissions: "open",
        },
        {
          resource: createPostResource(),
          adapter: createInMemoryAdapter(),
          permissions: "open",
        },
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
      {
        resource: createPostResource(),
        adapter: posts,
        path: "posts",
        permissions: "open",
      },
      {
        resource: createPostResource(),
        adapter: pages,
        path: "pages",
        permissions: "open",
      },
    ],
  });

  const postsList = await handler(new Request("https://x/posts"));
  const pagesList = await handler(new Request("https://x/pages"));

  assert.equal((await postsList.json()).data[0].title, "Hello");
  assert.equal((await pagesList.json()).data[0].title, "About");
});
