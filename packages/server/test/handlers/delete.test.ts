import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { handleDelete } from "../../src/handlers/delete.js";
import { buildRouteTable } from "../../src/routing/route-table.js";
import {
  createInMemoryAdapter,
  createPostResource,
  verikitError,
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
    [
      {
        resource: createPostResource(),
        adapter,
        permissions: permissions ?? "open",
      },
    ],
    "",
  );
  return {
    entry: entry!,
    actor: { role: "viewer" } as Actor,
    request: new Request("https://x/post/1", { method: "DELETE" }),
    url: new URL("https://x/post/1"),
    maxBodyBytes: 1_048_576,
  };
}

const post: Post = { id: "1", title: "Hello", body: "world", published: false };

test("handleDelete removes the record and returns 204", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const response = await handleDelete(ctxFor(adapter), "1");

  assert.equal(response.status, 204);
  assert.equal(adapter.records.length, 0);
});

test("handleDelete throws a 404 NotFoundError for a missing record", async () => {
  await assert.rejects(
    handleDelete(ctxFor(createInMemoryAdapter()), "missing"),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleDelete throws a 404 NotFoundError (not 403) when the actor lacks delete access, without deleting, so existence isn't leaked", async () => {
  const permissions = definePermissions<Actor>().can(
    "delete",
    ({ actor }) => actor.role === "admin",
  );
  const adapter = createInMemoryAdapter([{ ...post }]);

  await assert.rejects(
    handleDelete(ctxFor(adapter, permissions), "1"),
    verikitError(404, "NOT_FOUND"),
  );
  assert.equal(adapter.records.length, 1);
});
