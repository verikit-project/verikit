import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions, type ValidationError } from "@verikit/core";
import { UniqueConstraintError } from "../../src/adapter.js";
import { handleUpdate } from "../../src/handlers/update.js";
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
  const request = new Request("https://x/post/1", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return {
    table,
    ctx: {
      entry: table[0]!,
      actor: { role: "viewer" } as Actor,
      request,
      url: new URL("https://x/post/1"),
      maxBodyBytes: 1_048_576,
    },
  };
}

const post: Post = { id: "1", title: "Hello", body: "world", published: false };

test("handleUpdate validates a partial body and returns the updated record", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const { ctx, table } = ctxFor(adapter, { published: true });

  const response = await handleUpdate(ctx, table, "1");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.published, true);
  assert.equal(body.data.title, "Hello");
});

test("handleUpdate throws a 404 NotFoundError for a missing record before checking permissions", async () => {
  const { ctx, table } = ctxFor(createInMemoryAdapter(), { title: "x" });
  await assert.rejects(
    handleUpdate(ctx, table, "missing"),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleUpdate throws a 400 ValidationError for an invalid JSON body", async () => {
  const { ctx, table } = ctxFor(
    createInMemoryAdapter([{ ...post }]),
    "{not json",
  );
  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError(400, "VALIDATION_ERROR"),
  );
});

test("handleUpdate throws a 400 ValidationError with issues when a submitted field fails its own constraints", async () => {
  const { ctx, table } = ctxFor(createInMemoryAdapter([{ ...post }]), {
    title: null,
  });
  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError<ValidationError>(400, "VALIDATION_ERROR", (error) => {
      assert.ok(Array.isArray(error.issues));
      assert.ok(error.issues.length > 0);
    }),
  );
});

test("handleUpdate throws a 404 NotFoundError when the adapter's update() reports the record gone, even though find() (checked earlier) still saw it", async () => {
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
  const { ctx, table } = ctxFor(adapter, { title: "x" });

  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleUpdate throws a 404 NotFoundError (not 403) when the actor lacks update access, so existence isn't leaked", async () => {
  const permissions = definePermissions<Actor>().can(
    "update",
    ({ actor }) => actor.role === "admin",
  );
  const { ctx, table } = ctxFor(
    createInMemoryAdapter([{ ...post }]),
    { title: "x" },
    permissions,
  );

  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleUpdate throws a 400 ValidationError with a field issue when the adapter reports a unique-constraint violation", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  adapter.update = async () => {
    throw new UniqueConstraintError(["title"]);
  };
  const { ctx, table } = ctxFor(adapter, { title: "Taken" });

  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError<ValidationError>(400, "VALIDATION_ERROR", (error) => {
      assert.deepEqual(error.issues, [
        {
          path: ["title"],
          message: "A record with this title already exists.",
        },
      ]);
    }),
  );
});

test("handleUpdate rethrows an adapter error that isn't a UniqueConstraintError", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  adapter.update = async () => {
    throw new Error("connection reset");
  };
  const { ctx, table } = ctxFor(adapter, { title: "x" });

  await assert.rejects(
    () => handleUpdate(ctx, table, "1"),
    (error: unknown) =>
      error instanceof Error && error.message === "connection reset",
  );
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
  const { ctx, table } = ctxFor(adapter, { title: "Updated" }, permissions);

  const body = await (await handleUpdate(ctx, table, "1")).json();
  assert.deepEqual(body.data, { id: "1", title: "Updated" });
});
