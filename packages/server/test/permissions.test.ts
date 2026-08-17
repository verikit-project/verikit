import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, definePermissions, text } from "@verikit/core";
import {
  maybeCheckResourceOperation,
  presentRecord,
  redactFields,
  unreadableFieldNames,
  validateResourceInput,
} from "../src/permissions.js";
import { createPostResource } from "./fixtures.js";

interface Actor {
  role: "admin" | "viewer";
}

test("maybeCheckResourceOperation allows everything when the resource is marked open", async () => {
  const result = await maybeCheckResourceOperation("open", "read", {
    actor: { role: "viewer" },
  });
  assert.deepEqual(result, { allowed: true });
});

test("maybeCheckResourceOperation defers to checkResourceOperation when permissions are set", async () => {
  const permissions = definePermissions<Actor>().can(
    "delete",
    ({ actor }) => actor.role === "admin",
  );

  assert.deepEqual(
    await maybeCheckResourceOperation(permissions, "delete", {
      actor: { role: "viewer" },
    }),
    { allowed: false, message: undefined },
  );
  assert.deepEqual(
    await maybeCheckResourceOperation(permissions, "delete", {
      actor: { role: "admin" },
    }),
    { allowed: true, message: undefined },
  );
});

test("maybeCheckResourceOperation surfaces the denying rule's reason", async () => {
  const permissions = definePermissions<Actor>().can("delete", () => ({
    allowed: false,
    reason: "Only admins may delete.",
  }));

  assert.deepEqual(
    await maybeCheckResourceOperation(permissions, "delete", {
      actor: { role: "viewer" },
    }),
    { allowed: false, message: "Only admins may delete." },
  );
});

test("unreadableFieldNames is empty when the resource is marked open", async () => {
  const fields = createPostResource().toSchema().fields;
  const hidden = await unreadableFieldNames(fields, "open", {
    actor: { role: "viewer" },
  });
  assert.deepEqual(hidden, new Set());
});

test("unreadableFieldNames fails closed: fields with no read rule are hidden", async () => {
  const fields = createPostResource().toSchema().fields;
  const permissions = definePermissions<Actor>().field("title", { read: true });

  const hidden = await unreadableFieldNames(fields, permissions, {
    actor: { role: "viewer" },
  });

  assert.deepEqual(hidden, new Set(["body", "published"]));
});

test("unreadableFieldNames resolves a static `read: false` rule without evaluating it per row", async () => {
  const fields = createPostResource().toSchema().fields;
  const permissions = definePermissions<Actor>()
    .field("title", { read: true })
    .field("body", { read: false });

  const hidden = await unreadableFieldNames(fields, permissions, {
    actor: { role: "viewer" },
  });

  assert.deepEqual(hidden, new Set(["body", "published"]));
});

test("unreadableFieldNames fails closed when a contextual read rule throws", async () => {
  const fields = createPostResource().toSchema().fields;
  const permissions = definePermissions<Actor>()
    .field("title", { read: true })
    .field("body", {
      read: () => {
        throw new Error("permission service unavailable");
      },
    });

  const hidden = await unreadableFieldNames(fields, permissions, {
    actor: { role: "viewer" },
  });

  assert.deepEqual(hidden, new Set(["body", "published"]));
});

test("redactFields removes hidden keys, and returns the same object when nothing is hidden", () => {
  const record = { id: "1", title: "Hi", body: "text" };

  assert.equal(redactFields(record, new Set()), record);
  assert.deepEqual(redactFields(record, new Set(["body"])), {
    id: "1",
    title: "Hi",
  });
});

test("presentRecord allow-lists canonical id and declared readable fields", () => {
  const fields = createPostResource().toSchema().fields;
  const record = {
    id: "1",
    title: "Hi",
    body: "text",
    passwordHash: "never expose this",
  };

  assert.deepEqual(presentRecord(record, fields, new Set(["body"])), {
    id: "1",
    title: "Hi",
  });
});

test("validateResourceInput uses plain validation when the resource is marked open", async () => {
  const fields = createPostResource().toSchema().fields;

  const missingRequired = await validateResourceInput(fields, {}, "open", {
    actor: { role: "viewer" },
  });
  assert.equal(missingRequired.success, false);

  const valid = await validateResourceInput(fields, { title: "Hi" }, "open", {
    actor: { role: "viewer" },
  });
  assert.equal(valid.success, true);
});

test("validateResourceInput gates per-field write access when permissions are configured", async () => {
  const fields = createPostResource().toSchema().fields;
  // "published" has a default, so `shouldValidateField` always checks its write access
  // even when absent from the submitted values (permissions fail closed per-field, see
  // [[permissions-module-notes]]) grant it here so this test isolates the "title" gating it's actually about.
  const permissions = definePermissions<Actor>()
    .field("title", { write: ({ actor }) => actor.role === "admin" })
    .field("published", { write: true });

  const asViewer = await validateResourceInput(
    fields,
    { title: "Hi" },
    permissions,
    { actor: { role: "viewer" } },
  );
  assert.equal(asViewer.success, false);

  const asAdmin = await validateResourceInput(
    fields,
    { title: "Hi" },
    permissions,
    { actor: { role: "admin" } },
  );
  assert.equal(asAdmin.success, true);
});

test("validateResourceInput validates trusted fields via plain schema validation and merges them with the permission-gated result", async () => {
  const fields = createPostResource().toSchema().fields;
  const permissions = definePermissions<Actor>()
    .field("body", { write: () => true })
    .field("published", { write: () => true });

  // "title" is server-owned (trusted): it must still be validated, but without
  // requiring its own write grant, and its validated value must end up in the
  // merged result alongside the permission-gated "body"/"published" values.
  const merged = await validateResourceInput(
    fields,
    { body: "hi", title: "Trusted" },
    permissions,
    { actor: { role: "viewer" } },
    { title: "Trusted" },
  );
  assert.deepEqual(merged, {
    success: true,
    value: { body: "hi", published: false, title: "Trusted" },
  });

  // A trusted value that fails plain schema validation (here: null against a
  // non-nullable text field) still surfaces as a failure, independent of the
  // client fields' own (successful) permission-gated validation.
  const trustedInvalid = await validateResourceInput(
    fields,
    { body: "hi", title: null },
    permissions,
    { actor: { role: "viewer" } },
    { title: null },
  );
  assert.equal(trustedInvalid.success, false);
});

function createSlugResource() {
  return defineResource("post", {
    fields: {
      title: text().required(),
      slug: text().required().readOnly(),
    },
  });
}

test("validateResourceInput drops a readOnly field's client-submitted value, even with a write grant", async () => {
  const fields = createSlugResource().toSchema().fields;
  const permissions = definePermissions<Actor>()
    .field("title", { write: () => true })
    .field("slug", { write: () => true });

  const result = await validateResourceInput(
    fields,
    { title: "Hi", slug: "client-supplied" },
    permissions,
    { actor: { role: "viewer" } },
  );

  assert.deepEqual(result, { success: true, value: { title: "Hi" } });
});

test("validateResourceInput still validates and includes a readOnly field's value when it's also server-owned (trusted)", async () => {
  const fields = createSlugResource().toSchema().fields;
  const permissions = definePermissions<Actor>().field("title", {
    write: () => true,
  });

  // Mirrors how `create.ts`/`update.ts` actually call this: trusted values
  // are merged into `values` (overriding any client-submitted value for the
  // same key) before this function ever sees them.
  const result = await validateResourceInput(
    fields,
    { title: "Hi", slug: "server-generated" },
    permissions,
    { actor: { role: "viewer" } },
    { slug: "server-generated" },
  );

  assert.deepEqual(result, {
    success: true,
    value: { title: "Hi", slug: "server-generated" },
  });
});

test("validateResourceInput drops a readOnly field's value even on an open resource", async () => {
  const fields = createSlugResource().toSchema().fields;

  const result = await validateResourceInput(
    fields,
    { title: "Hi", slug: "client-supplied" },
    "open",
    { actor: { role: "viewer" } },
  );

  assert.deepEqual(result, { success: true, value: { title: "Hi" } });
});
