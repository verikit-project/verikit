import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { createServer } from "../../src/create-server.js";
import {
  createInMemoryAdapter,
  createPostResource,
  type Post,
} from "../fixtures.js";

interface Actor {
  role: "admin" | "viewer";
}

const posts: Post[] = [
  { id: "1", title: "Hello", body: "", published: false },
  { id: "2", title: "World", body: "", published: false },
];

// A role-only rule: the case unconditional writes are meant for.
const permissions = definePermissions<Actor>()
  .can("read", true)
  .can("update", ({ actor }) => actor.role === "admin")
  .can("delete", ({ actor }) => actor.role === "admin")
  .field("title", { read: true, write: true });

function serverFor(
  adapter: ReturnType<typeof createInMemoryAdapter>,
  unsafeUnconditionalWrites?: true,
) {
  return createServer<Actor>({
    context: (request) => ({
      role: request.headers.get("x-role") === "admin" ? "admin" : "viewer",
    }),
    resources: [
      {
        resource: createPostResource(),
        adapter,
        permissions,
        ...(unsafeUnconditionalWrites && { unsafeUnconditionalWrites }),
      },
    ],
  });
}

function request(
  method: string,
  id: string,
  role: Actor["role"],
  body?: unknown,
): Request {
  return new Request(`https://x/post/${id}`, {
    method,
    headers: { "x-role": role },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

function adapterWithoutRevisions() {
  const adapter = createInMemoryAdapter(posts.map((post) => ({ ...post })));
  adapter.findForMutation = undefined;
  return adapter;
}

test("without the opt-out, protected update and delete still return 501 on an adapter without revisions", async () => {
  const adapter = adapterWithoutRevisions();
  const handler = serverFor(adapter);

  const update = await handler(
    request("PATCH", "1", "admin", { title: "Changed" }),
  );
  const remove = await handler(request("DELETE", "1", "admin"));

  assert.equal(update.status, 501);
  assert.equal(remove.status, 501);
  assert.equal(adapter.records.length, 2);
  assert.equal(adapter.records[0]!.title, "Hello");
});

test("unsafeUnconditionalWrites lets permitted updates and deletes through, still checking permissions", async () => {
  const adapter = adapterWithoutRevisions();
  const handler = serverFor(adapter, true);

  const denied = await handler(
    request("PATCH", "1", "viewer", { title: "Nope" }),
  );
  assert.equal(denied.status, 404);
  assert.equal((await handler(request("DELETE", "1", "viewer"))).status, 404);

  const updated = await handler(
    request("PATCH", "1", "admin", { title: "Changed" }),
  );
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).data.title, "Changed");

  assert.equal((await handler(request("DELETE", "2", "admin"))).status, 204);
  assert.deepEqual(
    adapter.records.map((record) => record.id),
    ["1"],
  );

  const missing = await handler(
    request("PATCH", "404", "admin", { title: "x" }),
  );
  assert.equal(missing.status, 404);
});

test("an adapter that supports revisions keeps writing conditionally even with the opt-out", async () => {
  const adapter = createInMemoryAdapter(posts.map((post) => ({ ...post })));
  const revisions: (number | undefined)[] = [];
  const update = adapter.update.bind(adapter);
  const remove = adapter.delete.bind(adapter);
  adapter.update = (id, values, scope, expectedRevision) => {
    revisions.push(expectedRevision);
    return update(id, values, scope, expectedRevision);
  };
  adapter.delete = (id, scope, expectedRevision) => {
    revisions.push(expectedRevision);
    return remove(id, scope, expectedRevision);
  };
  const handler = serverFor(adapter, true);

  await handler(request("PATCH", "1", "admin", { title: "Changed" }));
  await handler(request("DELETE", "2", "admin"));

  assert.equal(revisions.length, 2);
  assert.ok(revisions.every((revision) => typeof revision === "number"));
});
