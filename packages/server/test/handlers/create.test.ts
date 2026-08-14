import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { UniqueConstraintError } from "../../src/adapter.js";
import { handleCreate } from "../../src/handlers/create.js";
import { buildRouteTable } from "../../src/routing/route-table.js";
import { createInMemoryAdapter, createPostResource } from "../fixtures.js";

interface Actor {
  role: "admin" | "viewer";
}

function ctxFor(
  adapter: ReturnType<typeof createInMemoryAdapter>,
  body: unknown,
  permissions?: ReturnType<typeof definePermissions<Actor>>,
) {
  const table = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter,
        permissions: permissions ?? "open",
      },
    ],
    "",
  );
  const request = new Request("https://x/post", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return {
    table,
    ctx: {
      entry: table[0]!,
      actor: { role: "viewer" } as Actor,
      request,
      url: new URL("https://x/post"),
      maxBodyBytes: 1_048_576,
    },
  };
}

test("handleCreate validates, creates, and returns 201 with the new record", async () => {
  const adapter = createInMemoryAdapter();
  const { ctx, table } = ctxFor(adapter, { title: "Hi", body: "text" });

  const response = await handleCreate(ctx, table);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.title, "Hi");
  assert.equal(adapter.records.length, 1);
});

test("handleCreate returns 400 for an invalid JSON body", async () => {
  const { ctx, table } = ctxFor(createInMemoryAdapter(), "{not json");
  const response = await handleCreate(ctx, table);
  assert.equal(response.status, 400);
});

test("handleCreate returns 400 with issues when required fields are missing", async () => {
  const { ctx, table } = ctxFor(createInMemoryAdapter(), {});
  const response = await handleCreate(ctx, table);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(body.error.issues));
  assert.ok(body.error.issues.length > 0);
});

test("handleCreate returns 403 when the actor lacks resource-level create access", async () => {
  const permissions = definePermissions<Actor>().can(
    "create",
    ({ actor }) => actor.role === "admin",
  );
  const { ctx, table } = ctxFor(
    createInMemoryAdapter(),
    { title: "Hi" },
    permissions,
  );

  const response = await handleCreate(ctx, table);
  assert.equal(response.status, 403);
});

test("handleCreate enforces per-field write access when permissions are configured", async () => {
  const permissions = definePermissions<Actor>()
    .can("create", true)
    .field("title", { write: ({ actor }) => actor.role === "admin" });
  const { ctx, table } = ctxFor(
    createInMemoryAdapter(),
    { title: "Hi" },
    permissions,
  );

  const response = await handleCreate(ctx, table);
  assert.equal(response.status, 400);
});

test("handleCreate returns 400 with a field validation issue when the adapter reports a unique-constraint violation", async () => {
  const adapter = createInMemoryAdapter();
  adapter.create = async () => {
    throw new UniqueConstraintError(["title"]);
  };
  const { ctx, table } = ctxFor(adapter, { title: "Hi" });

  const response = await handleCreate(ctx, table);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body.error.issues, [
    { path: ["title"], message: "A record with this title already exists." },
  ]);
});

test("handleCreate rethrows an adapter error that isn't a UniqueConstraintError", async () => {
  const adapter = createInMemoryAdapter();
  adapter.create = async () => {
    throw new Error("connection reset");
  };
  const { ctx, table } = ctxFor(adapter, { title: "Hi" });

  await assert.rejects(
    () => handleCreate(ctx, table),
    (error: unknown) =>
      error instanceof Error && error.message === "connection reset",
  );
});

test("handleCreate returns only fields readable by the actor", async () => {
  const adapter = createInMemoryAdapter();
  const create = adapter.create;
  adapter.create = async (values) => ({
    ...(await create(values)),
    passwordHash: "never expose this",
  });
  const permissions = definePermissions<Actor>()
    .can("create", true)
    .field("title", { read: true, write: true })
    .field("published", { write: true });
  const { ctx, table } = ctxFor(adapter, { title: "Hi" }, permissions);

  const body = await (await handleCreate(ctx, table)).json();
  assert.deepEqual(body.data, { id: adapter.records[0]!.id, title: "Hi" });
});
