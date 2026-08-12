import assert from "node:assert/strict";
import test from "node:test";
import {
  definePermissions,
  defineResource,
  image,
  number,
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

test("an access.scope hook returning no constraints leaves storage operations unscoped", async () => {
  const resource = defineResource("project", {
    fields: {
      title: text().required(),
      organizationId: text().required(),
    },
    access: {
      scope: () => ({}),
    },
  });
  const adapter = createInMemoryAdapter([
    { ...post, id: "a", organizationId: "org-a" },
    { ...post, id: "b", organizationId: "org-b" },
  ]);
  const handler = createServer({
    resources: [{ resource, adapter, permissions: "open" }],
  });

  const list = await handler(new Request("https://x/project"));
  const listed = await list.json();
  assert.deepEqual(listed.data.map((record: Post) => record.id).sort(), [
    "a",
    "b",
  ]);
});

test("an access hook returning an unknown field maps to the standard 500 envelope", async () => {
  const resource = defineResource("project", {
    fields: { title: text().required() },
    access: {
      scope: () => ({ organizationId: "org-a" }),
    },
  });
  const observed: unknown[] = [];
  const handler = createServer({
    resources: [
      {
        resource,
        adapter: createInMemoryAdapter([]),
        permissions: "open",
      },
    ],
    onError: (error) => {
      observed.push(error);
    },
  });

  const response = await handler(new Request("https://x/project"));
  assert.equal(response.status, 500);
  assert.equal(observed.length, 1);
  assert.match(
    (observed[0] as Error).message,
    /access\.scope returned unknown field "organizationId"/,
  );
});

test("an access hook returning undefined for a known field maps to the standard 500 envelope", async () => {
  const resource = defineResource("project", {
    fields: { title: text().required() },
    access: {
      onCreate: () => ({ title: undefined }) as Record<string, unknown>,
    },
  });
  const observed: unknown[] = [];
  const handler = createServer({
    resources: [
      {
        resource,
        adapter: createInMemoryAdapter([]),
        permissions: "open",
      },
    ],
    onError: (error) => {
      observed.push(error);
    },
  });

  const response = await handler(
    new Request("https://x/project", {
      method: "POST",
      body: JSON.stringify({ title: "draft" }),
    }),
  );
  assert.equal(response.status, 500);
  assert.equal(observed.length, 1);
  assert.match(
    (observed[0] as Error).message,
    /access\.onCreate returned undefined for "title"/,
  );
});

test("create validates client-controlled fields against non-open permissions while trusting access.onCreate's own fields", async () => {
  const resource = defineResource("project", {
    fields: {
      title: text().required(),
      organizationId: text().required(),
    },
    access: {
      onCreate: ({ actor }) => ({
        organizationId: (actor as { organizationId: string }).organizationId,
      }),
    },
  });
  const permissions = definePermissions<{ organizationId: string }>()
    .can("create", () => true)
    .field("title", { read: () => true, write: () => true })
    .field("organizationId", { read: () => true });
  const handler = createServer({
    resources: [
      {
        resource,
        adapter: createInMemoryAdapter([] as unknown as Post[]),
        permissions,
      },
    ],
    context: () => ({ organizationId: "org-a" }),
  });

  const response = await handler(
    new Request("https://x/project", {
      method: "POST",
      body: JSON.stringify({ title: "draft" }),
    }),
  );
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.data.title, "draft");
  assert.equal(body.data.organizationId, "org-a");

  const invalid = await handler(
    new Request("https://x/project", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );
  assert.equal(invalid.status, 400);
});

test("list supports opt-in exact field filters", async () => {
  const resource = defineResource("post", {
    fields: {
      title: text().required().filterable(),
      body: textarea(),
      published: boolean().default(false).filterable(),
      views: number().default(0).filterable(),
    },
  });
  const handler = createServer({
    resources: [
      {
        resource,
        adapter: createInMemoryAdapter([
          { ...post, id: "yes", published: true, title: "Alpha", views: 5 },
          { ...post, id: "no", published: false, title: "Beta", views: 9 },
        ] as unknown as Post[]),
        permissions: "open",
      },
    ],
  });

  const response = await handler(
    new Request("https://x/post?filter[published]=true"),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(
    body.data.map((record: Post) => record.id),
    ["yes"],
  );
  assert.equal(body.meta.total, 1);

  const byTitle = await (
    await handler(new Request("https://x/post?filter[title]=Beta"))
  ).json();
  assert.deepEqual(
    byTitle.data.map((record: Post) => record.id),
    ["no"],
  );

  const byViews = await (
    await handler(new Request("https://x/post?filter[views][gte]=9"))
  ).json();
  assert.deepEqual(
    byViews.data.map((record: Post) => record.id),
    ["no"],
  );

  const byInvalidViews = await (
    await handler(new Request("https://x/post?filter[views]=not-a-number"))
  ).json();
  assert.equal(byInvalidViews.meta.total, 2);

  // `body` is a real field but not `.filterable()`, and `nope` isn't a field at all;
  // both are silently ignored rather than filtering anything out.
  const byIgnoredFields = await (
    await handler(
      new Request("https://x/post?filter[body]=anything&filter[nope]=x"),
    )
  ).json();
  assert.equal(byIgnoredFields.meta.total, 2);

  const byNullTitle = await (
    await handler(new Request("https://x/post?filter[title]=null"))
  ).json();
  assert.equal(byNullTitle.meta.total, 0);

  const byPublishedFalse = await (
    await handler(new Request("https://x/post?filter[published]=false"))
  ).json();
  assert.deepEqual(
    byPublishedFalse.data.map((record: Post) => record.id),
    ["no"],
  );

  const byPublishedInvalid = await (
    await handler(new Request("https://x/post?filter[published]=maybe"))
  ).json();
  assert.equal(byPublishedInvalid.meta.total, 2);
});

test("file fields upload through the configured storage backend", async () => {
  const stored: { name: string; type: string; size: number }[] = [];
  const resource = defineResource("asset", {
    fields: { attachment: image().maxSize(10) },
  });
  const handler = createServer({
    resources: [
      { resource, adapter: createInMemoryAdapter(), permissions: "open" },
    ],
    storage: {
      async put({ file }) {
        stored.push({ name: file.name, type: file.type, size: file.size });
        return {
          url: `https://files.example/${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      },
    },
  });
  const form = new FormData();
  form.set("file", new Blob(["hello"], { type: "image/png" }), "avatar.png");

  const response = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: form,
    }),
  );
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: {
      url: "https://files.example/avatar.png",
      name: "avatar.png",
      type: "image/png",
      size: 5,
    },
  });
  assert.equal(stored.length, 1);
});

test("uploads to a non-file field or unknown field name 404", async () => {
  const resource = defineResource("asset", {
    fields: { title: text(), attachment: image() },
  });
  const handler = createServer({
    resources: [
      { resource, adapter: createInMemoryAdapter(), permissions: "open" },
    ],
    storage: {
      async put({ file }) {
        return {
          url: `https://files.example/${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      },
    },
  });

  const form = new FormData();
  form.set("file", new Blob(["hello"]), "a.png");

  assert.equal(
    (
      await handler(
        new Request("https://x/asset/uploads/title", {
          method: "POST",
          body: form,
        }),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await handler(
        new Request("https://x/asset/uploads/missing", {
          method: "POST",
          body: form,
        }),
      )
    ).status,
    404,
  );
});

test("uploads 501 when no storage backend is configured", async () => {
  const resource = defineResource("asset", { fields: { attachment: image() } });
  const handler = createServer({
    resources: [
      { resource, adapter: createInMemoryAdapter(), permissions: "open" },
    ],
  });

  const form = new FormData();
  form.set("file", new Blob(["hello"]), "a.png");

  const response = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: form,
    }),
  );
  assert.equal(response.status, 501);
});

test("uploads are denied when the actor lacks field write permission", async () => {
  const resource = defineResource("asset", { fields: { attachment: image() } });
  const permissions = definePermissions<Actor>().field("attachment", {
    write: ({ actor }) => actor.role === "admin",
  });
  const handler = createServer({
    resources: [
      {
        resource,
        adapter: createInMemoryAdapter(),
        permissions,
      },
    ],
    context: () => ({ role: "viewer" }) satisfies Actor,
    storage: {
      async put({ file }) {
        return {
          url: `https://files.example/${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      },
    },
  });

  const form = new FormData();
  form.set("file", new Blob(["hello"]), "a.png");

  const response = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: form,
    }),
  );
  assert.equal(response.status, 403);
});

test("uploads reject non-multipart bodies, oversized declared lengths, oversized files, and disallowed types", async () => {
  const resource = defineResource("asset", {
    fields: { attachment: image().maxSize(10).accept(["image/png"]) },
  });
  const handler = createServer({
    resources: [
      { resource, adapter: createInMemoryAdapter(), permissions: "open" },
    ],
    maxBodyBytes: 20,
    storage: {
      async put({ file }) {
        return {
          url: `https://files.example/${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      },
    },
  });

  const notMultipart = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(notMultipart.status, 415);

  const oversizedForm = new FormData();
  oversizedForm.set("file", new Blob(["x".repeat(30)]), "a.png");
  const oversizedDeclared = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: oversizedForm,
      headers: { "content-length": "30" },
    }),
  );
  assert.equal(oversizedDeclared.status, 413);

  const tooBigFileForm = new FormData();
  tooBigFileForm.set(
    "file",
    new Blob(["x".repeat(15)], { type: "image/png" }),
    "a.png",
  );
  const tooBigFile = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: tooBigFileForm,
    }),
  );
  assert.equal(tooBigFile.status, 413);

  const wrongTypeForm = new FormData();
  wrongTypeForm.set("file", new Blob(["hi"], { type: "text/plain" }), "a.txt");
  const wrongType = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: wrongTypeForm,
    }),
  );
  assert.equal(wrongType.status, 415);

  const garbageLengthForm = new FormData();
  garbageLengthForm.set(
    "file",
    new Blob(["hi"], { type: "image/png" }),
    "a.png",
  );
  const garbageLength = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: garbageLengthForm,
      headers: { "content-length": "not-a-number" },
    }),
  );
  assert.equal(garbageLength.status, 201);

  const nonBlobForm = new FormData();
  nonBlobForm.set("file", "just a string, not a file");
  const nonBlob = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: nonBlobForm,
    }),
  );
  assert.equal(nonBlob.status, 400);
});

test("uploads with an explicit empty accept list allow any file type through", async () => {
  const resource = defineResource("asset", {
    fields: { attachment: image().accept([]) },
  });
  const handler = createServer({
    resources: [
      { resource, adapter: createInMemoryAdapter(), permissions: "open" },
    ],
    storage: {
      async put({ file }) {
        return {
          url: `https://files.example/${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      },
    },
  });

  const form = new FormData();
  form.set("file", new Blob(["hi"], { type: "text/plain" }), "a.txt");

  const response = await handler(
    new Request("https://x/asset/uploads/attachment", {
      method: "POST",
      body: form,
    }),
  );
  assert.equal(response.status, 201);
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
