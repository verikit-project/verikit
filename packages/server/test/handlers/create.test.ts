import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
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
  const [entry] = buildRouteTable(
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
    entry: entry!,
    actor: { role: "viewer" } as Actor,
    request,
    url: new URL("https://x/post"),
  };
}

test("handleCreate validates, creates, and returns 201 with the new record", async () => {
  const adapter = createInMemoryAdapter();
  const ctx = ctxFor(adapter, { title: "Hi", body: "text" });

  const response = await handleCreate(ctx);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.title, "Hi");
  assert.equal(adapter.records.length, 1);
});

test("handleCreate returns 400 for an invalid JSON body", async () => {
  const ctx = ctxFor(createInMemoryAdapter(), "{not json");
  const response = await handleCreate(ctx);
  assert.equal(response.status, 400);
});

test("handleCreate returns 400 with issues when required fields are missing", async () => {
  const ctx = ctxFor(createInMemoryAdapter(), {});
  const response = await handleCreate(ctx);
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
  const ctx = ctxFor(createInMemoryAdapter(), { title: "Hi" }, permissions);

  const response = await handleCreate(ctx);
  assert.equal(response.status, 403);
});

test("handleCreate enforces per-field write access when permissions are configured", async () => {
  const permissions = definePermissions<Actor>()
    .can("create", true)
    .field("title", { write: ({ actor }) => actor.role === "admin" });
  const ctx = ctxFor(createInMemoryAdapter(), { title: "Hi" }, permissions);

  const response = await handleCreate(ctx);
  assert.equal(response.status, 400);
});
