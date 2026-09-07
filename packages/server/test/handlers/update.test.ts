import assert from "node:assert/strict";
import test from "node:test";
import {
  boolean,
  defineResource,
  text,
  definePermissions,
  type Resource,
  type ValidationError,
} from "@verikit/core";
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
  resource: Resource = createPostResource(),
) {
  const table = buildRouteTable(
    [
      {
        resource,
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

function conditionalResource(scoped = false) {
  return defineResource("post", {
    fields: {
      title: text().required(),
      body: text().required().visibleWhen("published", true),
      published: boolean().default(false),
    },
    ...(scoped ? { access: { scope: () => ({ published: true }) } } : {}),
  });
}

for (const guarded of [false, true]) {
  test(`PATCH uses stored sibling values without rewriting or validating omitted fields (permissions: ${guarded})`, async () => {
    // The omitted required title is deliberately invalid; published is also
    // unwritable under guarded permissions. Neither should be validated/written.
    const adapter = createInMemoryAdapter([
      { ...post, title: "", published: true },
    ]);
    const writes: Record<string, unknown>[] = [];
    const update = adapter.update;
    adapter.update = async (id, values, scope) => {
      writes.push(values);
      return update(id, values, scope);
    };
    const permissions = guarded
      ? definePermissions<Actor>()
          .can("update", true)
          .field("body", { read: true, write: true })
      : undefined;
    const { ctx, table } = ctxFor(
      adapter,
      { body: "replacement" },
      permissions,
      conditionalResource(),
    );
    await handleUpdate(ctx, table, "1");
    assert.deepEqual(writes, [{ body: "replacement" }]);
    assert.deepEqual(adapter.records[0], {
      ...post,
      title: "",
      published: true,
      body: "replacement",
    });
  });
}

for (const [existingPublished, patch, expected] of [
  [
    false,
    { published: true, body: "replacement" },
    { published: true, body: "replacement" },
  ],
  [true, { published: false, body: "replacement" }, { published: false }],
  [false, { body: "replacement" }, {}],
  [true, {}, {}],
] as const) {
  test(`PATCH conditions use the new sibling value when supplied: ${existingPublished}, ${JSON.stringify(patch)}`, async () => {
    const adapter = createInMemoryAdapter([
      { ...post, published: existingPublished },
    ]);
    const writes: Record<string, unknown>[] = [];
    const update = adapter.update;
    adapter.update = async (id, values, scope) => {
      writes.push(values);
      return update(id, values, scope);
    };
    const { ctx, table } = ctxFor(
      adapter,
      patch,
      undefined,
      conditionalResource(),
    );
    await handleUpdate(ctx, table, "1");
    assert.deepEqual(writes, [expected]);
  });
}

test("PATCH validates an active conditional field against its constraints", async () => {
  const adapter = createInMemoryAdapter([{ ...post, published: true }]);
  const { ctx, table } = ctxFor(
    adapter,
    { body: null },
    undefined,
    conditionalResource(),
  );
  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError<ValidationError>(400, "VALIDATION_ERROR", (error) => {
      assert.deepEqual(
        error.issues.map((issue) => issue.path),
        [["body"]],
      );
    }),
  );
  assert.equal(adapter.records[0]?.body, "world");
});

test("PATCH still enforces write permissions on active conditional fields", async () => {
  const adapter = createInMemoryAdapter([{ ...post, published: true }]);
  const permissions = definePermissions<Actor>().can("update", true);
  const { ctx, table } = ctxFor(
    adapter,
    { body: "replacement" },
    permissions,
    conditionalResource(),
  );
  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError(400, "VALIDATION_ERROR"),
  );
  assert.equal(adapter.records[0]?.body, "world");
});

test("PATCH conditions honor trusted scope over a submitted sibling value", async () => {
  const adapter = createInMemoryAdapter([{ ...post, published: true }]);
  const permissions = definePermissions<Actor>()
    .can("update", true)
    .field("body", { read: true, write: true });
  const { ctx, table } = ctxFor(
    adapter,
    { published: false, body: "replacement" },
    permissions,
    conditionalResource(true),
  );
  await handleUpdate(ctx, table, "1");
  assert.deepEqual(adapter.records[0], {
    ...post,
    published: true,
    body: "replacement",
  });
});

test("update rejects a revision changed during an asynchronous permission check", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const permissions = definePermissions<Actor>()
    .can("update", async ({ record }) => {
      const allowed = !(record as Post).published;
      await adapter.update("1", { published: true });
      return allowed;
    })
    .field("title", { write: true, read: true });
  const { ctx, table } = ctxFor(
    adapter,
    { title: "Unauthorized edit" },
    permissions,
  );
  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError(409, "CONFLICT"),
  );
  assert.deepEqual(adapter.records[0], { ...post, published: true });
});

test("protected update fails closed without conditional-write support", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  adapter.findForMutation = undefined;
  const permissions = definePermissions<Actor>()
    .can("update", true)
    .field("title", { write: true });
  const { ctx, table } = ctxFor(
    adapter,
    { title: "Never written" },
    permissions,
  );
  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError(501, "NOT_IMPLEMENTED"),
  );
  assert.deepEqual(adapter.records[0], post);
});

test("update rejects changes during field authorization after the resource check", async () => {
  const adapter = createInMemoryAdapter([{ ...post }]);
  const permissions = definePermissions<Actor>()
    .can("update", true)
    .field("title", {
      write: async ({ record }) => {
        const allowed = !(record as Post).published;
        await adapter.update("1", { published: true });
        return allowed;
      },
    });
  const { ctx, table } = ctxFor(
    adapter,
    { title: "Unauthorized edit" },
    permissions,
  );
  await assert.rejects(
    handleUpdate(ctx, table, "1"),
    verikitError(409, "CONFLICT"),
  );
  assert.deepEqual(adapter.records[0], { ...post, published: true });
});
