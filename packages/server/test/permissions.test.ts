import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import {
  maybeCheckResourceOperation,
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

test("redactFields removes hidden keys, and returns the same object when nothing is hidden", () => {
  const record = { id: "1", title: "Hi", body: "text" };

  assert.equal(redactFields(record, new Set()), record);
  assert.deepEqual(redactFields(record, new Set(["body"])), {
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
