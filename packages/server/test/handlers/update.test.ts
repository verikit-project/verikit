import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { handleUpdate } from "../../src/handlers/update.js";
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
  const request = new Request("https://x/post/1", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return {
    entry: entry!,
    actor: { role: "viewer" } as Actor,
    request,
    url: new URL("https://x/post/1"),
    maxBodyBytes: 1_048_576,
  };
}

const post: Post = { id: "1", title: "Hello", body: "world", published: false };

test("handleUpdate validates a partial body and returns the updated record", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const ctx = ctxFor(adapter, { published: true });

  const response = await handleUpdate(ctx, "1");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.published, true);
  assert.equal(body.data.title, "Hello");
});

test("handleUpdate returns 404 for a missing record before checking permissions", async () => {
  const ctx = ctxFor(createInMemoryAdapter(), { title: "x" });
  const response = await handleUpdate(ctx, "missing");
  assert.equal(response.status, 404);
});

test("handleUpdate returns 400 for an invalid JSON body", async () => {
  const ctx = ctxFor(createInMemoryAdapter([{ ...post }]), "{not json");
  const response = await handleUpdate(ctx, "1");
  assert.equal(response.status, 400);
});

test("handleUpdate returns 400 with issues when a submitted field fails its own constraints", async () => {
  const ctx = ctxFor(createInMemoryAdapter([{ ...post }]), { title: null });
  const response = await handleUpdate(ctx, "1");
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(body.error.issues));
  assert.ok(body.error.issues.length > 0);
});

test("handleUpdate returns 404 when the adapter's update() reports the record gone, even though find() (checked earlier) still saw it", async () => {
  // Simulates a race between handleUpdate's own existence/permission check and the
  // adapter's actual update call (e.g. a concurrent delete landing in between): find()
  // still sees the record, but update() reports it missing, matching find's own
  // `undefined`-for-missing signal rather than throwing.
  const adapter = {
    ...createInMemoryAdapter([{ ...post }]),
    async update(): Promise<Post | undefined> {
      return undefined;
    },
  };
  const ctx = ctxFor(adapter, { title: "x" });

  const response = await handleUpdate(ctx, "1");
  assert.equal(response.status, 404);
});

test("handleUpdate returns 404 (not 403) when the actor lacks update access, so existence isn't leaked", async () => {
  const permissions = definePermissions<Actor>().can(
    "update",
    ({ actor }) => actor.role === "admin",
  );
  const ctx = ctxFor(
    createInMemoryAdapter([{ ...post }]),
    { title: "x" },
    permissions,
  );

  const response = await handleUpdate(ctx, "1");
  assert.equal(response.status, 404);
});

test("handleUpdate returns only fields readable by the actor", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const update = adapter.update;
  adapter.update = async (id, values) => {
    const record = await update(id, values);
    return record && { ...record, passwordHash: "never expose this" };
  };
  const permissions = definePermissions<Actor>()
    .can("update", true)
    .field("title", { read: true, write: true });
  const ctx = ctxFor(adapter, { title: "Updated" }, permissions);

  const body = await (await handleUpdate(ctx, "1")).json();
  assert.deepEqual(body.data, { id: "1", title: "Updated" });
});
