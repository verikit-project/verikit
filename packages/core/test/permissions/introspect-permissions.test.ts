import assert from "node:assert/strict";
import test from "node:test";
import {
  definePermissions,
  introspectPermissions,
} from "../../src/permissions/index.js";

interface Actor {
  role: string;
}

test("static allow/deny rules surface as allow/deny", () => {
  const permissions = definePermissions()
    .can("create", true)
    .can("delete", false);

  assert.deepEqual(introspectPermissions(permissions).resource, {
    create: "allow",
    delete: "deny",
  });
});

test("a function rule surfaces as dynamic without being evaluated", () => {
  const permissions = definePermissions<Actor>().can(
    "update",
    ({ actor }) => actor.role === "admin",
  );

  assert.deepEqual(introspectPermissions(permissions).resource, {
    update: "dynamic",
  });
});

test("an operation with no attached rule is omitted, not reported as deny", () => {
  const permissions = definePermissions().can("create", true);

  const { resource } = introspectPermissions(permissions);
  assert.equal("list" in resource, false);
  assert.equal("read" in resource, false);
  assert.equal("update" in resource, false);
  assert.equal("delete" in resource, false);
});

test("field read/write presence is summarized per field", () => {
  const permissions = definePermissions({ fields: ["email"] }).field("email", {
    read: true,
    write: false,
  });

  assert.deepEqual(introspectPermissions(permissions).fields, {
    email: { read: "allow", write: "deny" },
  });
});

test("action presence is summarized per action", () => {
  const permissions = definePermissions({ actions: ["publish"] }).action(
    "publish",
    true,
  );

  assert.deepEqual(introspectPermissions(permissions).actions, {
    publish: "allow",
  });
});

test("introspection output contains no functions and round-trips through JSON", () => {
  const permissions = definePermissions<Actor>({
    fields: ["email"],
    actions: ["publish"],
  })
    .can("create", ({ actor }) => actor.role === "admin")
    .field("email", { read: true })
    .action("publish", false);

  const introspection = introspectPermissions(permissions);
  const roundTripped = JSON.parse(JSON.stringify(introspection));

  assert.deepEqual(roundTripped, introspection);
});
