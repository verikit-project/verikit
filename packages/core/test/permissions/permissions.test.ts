import assert from "node:assert/strict";
import test from "node:test";
import {
  checkAction,
  checkFieldAccess,
  checkResourceOperation,
  definePermissions,
  defineResourcePermissions,
  normalizePermissionResult,
  normalizePermissionRule,
  PermissionsBuilder,
} from "../../src/permissions/index.js";
import { text } from "../../src/fields/index.js";
import { defineResource } from "../../src/resource/index.js";

interface Actor {
  role: "admin" | "editor" | "viewer";
}

interface Post {
  authorId: string;
}

test("definePermissions returns an empty builder", () => {
  const permissions = definePermissions();

  assert.ok(permissions instanceof PermissionsBuilder);
  assert.deepEqual(permissions.getRuntime(), {
    resource: {},
    fields: {},
    actions: {},
  });
});

test("normalizePermissionResult widens booleans to the object form", () => {
  assert.deepEqual(normalizePermissionResult(true), { allowed: true });
  assert.deepEqual(normalizePermissionResult(false), { allowed: false });
  assert.deepEqual(normalizePermissionResult({ allowed: true, reason: "ok" }), {
    allowed: true,
    reason: "ok",
  });
});

test("normalizePermissionRule wraps a boolean shorthand into an always-returning rule", () => {
  const allow = normalizePermissionRule(true);
  const deny = normalizePermissionRule(false);

  assert.equal(allow({ actor: undefined }), true);
  assert.equal(deny({ actor: undefined }), false);
});

test("normalizePermissionRule passes a function rule through unchanged", () => {
  const rule = ({ actor }: { actor: Actor }) => actor.role === "admin";

  assert.equal(normalizePermissionRule(rule), rule);
});

test("builder methods are immutable: each call returns a new instance without mutating the previous one", () => {
  const base = definePermissions<Actor, Post>();
  const withCan = base.can("delete", false);

  assert.deepEqual(base.getRuntime().resource, {});
  assert.equal(typeof withCan.getRuntime().resource.delete, "function");
});

test(".field() merges read/write access set across separate calls", () => {
  const permissions = definePermissions<Actor, Post>()
    .field("salary", { read: ({ actor }) => actor.role === "admin" })
    .field("salary", { write: false });

  const state = permissions.getRuntime();

  assert.equal(typeof state.fields.salary?.read, "function");
  assert.equal(typeof state.fields.salary?.write, "function");
});

test(".field() rejects an empty field name", () => {
  assert.throws(
    () => definePermissions().field("  ", { read: true }),
    /Field names must be non-empty strings\./,
  );
});

test(".action() rejects an empty action name", () => {
  assert.throws(
    () => definePermissions().action("", true),
    /Action names must be non-empty strings\./,
  );
});

test("checkResourceOperation defaults to allowed when no rule is attached", async () => {
  const permissions = definePermissions<Actor, Post>();

  assert.deepEqual(
    await checkResourceOperation(permissions, "delete", {
      actor: { role: "viewer" },
    }),
    { allowed: true },
  );
});

test("default allow results are fresh objects", async () => {
  const permissions = definePermissions<Actor, Post>();
  const result = await checkAction(permissions, "archive", {
    actor: { role: "viewer" },
  });

  result.allowed = false;

  assert.deepEqual(
    await checkAction(permissions, "archive", { actor: { role: "viewer" } }),
    { allowed: true },
  );
});

test("checkResourceOperation evaluates a boolean shorthand rule", async () => {
  const permissions = definePermissions<Actor, Post>().can("delete", false);

  assert.deepEqual(
    await checkResourceOperation(permissions, "delete", {
      actor: { role: "editor" },
    }),
    { allowed: false },
  );
});

test("checkResourceOperation evaluates a function rule against the given context", async () => {
  const permissions = definePermissions<Actor, Post>().can(
    "update",
    ({ actor, record }) => actor.role === "admin" || record?.authorId === "u1",
  );

  assert.deepEqual(
    await checkResourceOperation(permissions, "update", {
      actor: { role: "editor" },
      record: { authorId: "u1" },
    }),
    { allowed: true },
  );
  assert.deepEqual(
    await checkResourceOperation(permissions, "update", {
      actor: { role: "editor" },
      record: { authorId: "someone-else" },
    }),
    { allowed: false },
  );
});

test("checkResourceOperation awaits an async rule and preserves its reason", async () => {
  const permissions = definePermissions<Actor, Post>().can(
    "delete",
    async () => ({
      allowed: false,
      reason: "only admins may delete posts",
    }),
  );

  assert.deepEqual(
    await checkResourceOperation(permissions, "delete", {
      actor: { role: "editor" },
    }),
    { allowed: false, reason: "only admins may delete posts" },
  );
});

test("checkFieldAccess defaults to allowed for fields with no matching rule", async () => {
  const permissions = definePermissions<Actor, Post>().field("salary", {
    read: false,
  });

  assert.deepEqual(
    await checkFieldAccess(permissions, "salary", "write", {
      actor: { role: "viewer" },
    }),
    { allowed: true },
  );
  assert.deepEqual(
    await checkFieldAccess(permissions, "title", "read", {
      actor: { role: "viewer" },
    }),
    { allowed: true },
  );
});

test("checkFieldAccess evaluates read and write rules independently", async () => {
  const permissions = definePermissions<Actor, Post>().field("salary", {
    read: ({ actor }) => actor.role !== "viewer",
    write: ({ actor }) => actor.role === "admin",
  });

  assert.deepEqual(
    await checkFieldAccess(permissions, "salary", "read", {
      actor: { role: "editor" },
    }),
    { allowed: true },
  );
  assert.deepEqual(
    await checkFieldAccess(permissions, "salary", "write", {
      actor: { role: "editor" },
    }),
    { allowed: false },
  );
});

test("checkAction defaults to allowed when no rule is attached", async () => {
  const permissions = definePermissions<Actor, Post>();

  assert.deepEqual(
    await checkAction(permissions, "archive", { actor: { role: "viewer" } }),
    { allowed: true },
  );
});

test("checkAction evaluates the rule registered for that action name", async () => {
  const permissions = definePermissions<Actor, Post>().action(
    "archive",
    ({ actor }) => actor.role === "admin",
  );

  assert.deepEqual(
    await checkAction(permissions, "archive", { actor: { role: "admin" } }),
    { allowed: true },
  );
  assert.deepEqual(
    await checkAction(permissions, "archive", { actor: { role: "viewer" } }),
    { allowed: false },
  );
});

test("getRuntime returns a defensive snapshot", async () => {
  const permissions = definePermissions<Actor, Post>()
    .can("delete", false)
    .field("salary", { read: false })
    .action("archive", false);
  const runtime = permissions.getRuntime();

  runtime.resource.delete = () => true;
  runtime.fields.salary!.read = () => true;
  runtime.actions.archive = () => true;

  const viewer = { actor: { role: "viewer" } as Actor };

  assert.deepEqual(
    await checkResourceOperation(permissions, "delete", viewer),
    { allowed: false },
  );
  assert.deepEqual(
    await checkFieldAccess(permissions, "salary", "read", viewer),
    {
      allowed: false,
    },
  );
  assert.deepEqual(await checkAction(permissions, "archive", viewer), {
    allowed: false,
  });
});

test("constrained permissions reject unknown field and action names", () => {
  const permissions = definePermissions<Actor, Post, "title", "archive">({
    fields: ["title"],
    actions: ["archive"],
  });

  assert.doesNotThrow(() =>
    permissions.field("title", { read: true }).action("archive", true),
  );
  assert.throws(
    () => permissions.field("slaray" as "title", { read: false }),
    /Unknown field "slaray"\./,
  );
  assert.throws(
    () => permissions.action("arhcive" as "archive", false),
    /Unknown action "arhcive"\./,
  );
});

test("resource permissions infer and validate resource field names", () => {
  const post = defineResource("post", {
    fields: {
      title: text(),
      authorId: text(),
    },
  });
  const permissions = defineResourcePermissions<
    Actor,
    Post,
    typeof post,
    "archive"
  >(post, {
    actions: ["archive"],
  });

  assert.doesNotThrow(() =>
    permissions.field("title", { read: true }).action("archive", true),
  );
  assert.throws(
    () => permissions.field("slaray" as "title", { read: false }),
    /Unknown field "slaray"\./,
  );

  // eslint-disable-next-line no-constant-condition -- type-only check, never executed
  if (false) {
    // @ts-expect-error field names are inferred from the resource.
    permissions.field("slaray", { read: false });
    // @ts-expect-error action names are inferred from the provided action list.
    permissions.action("arhcive", false);
  }
});

test("a full permissions definition composes resource, field, and action rules independently", async () => {
  const permissions = definePermissions<Actor, Post>()
    .can("delete", ({ actor }) => actor.role === "admin")
    .field("salary", { read: ({ actor }) => actor.role !== "viewer" })
    .action("archive", ({ actor }) => actor.role !== "viewer");

  const viewer = { actor: { role: "viewer" } as Actor };

  assert.deepEqual(
    await checkResourceOperation(permissions, "delete", viewer),
    {
      allowed: false,
    },
  );
  assert.deepEqual(
    await checkFieldAccess(permissions, "salary", "read", viewer),
    {
      allowed: false,
    },
  );
  assert.deepEqual(
    await checkFieldAccess(permissions, "salary", "write", viewer),
    {
      allowed: true,
    },
  );
  assert.deepEqual(await checkAction(permissions, "archive", viewer), {
    allowed: false,
  });
});
