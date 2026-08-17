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
  staticPermissionValue,
  PermissionsBuilder,
  resolveResourceSchema,
  validateWritableFields,
} from "../../src/permissions/index.js";
import { belongsTo } from "../../src/relationships/index.js";
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
  assert.equal(rule({ actor: { role: "admin" } }), true);
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
  assert.equal(state.fields.salary?.read?.({ actor: { role: "admin" } }), true);
});

test("staticPermissionValue distinguishes boolean rules from contextual rules", () => {
  assert.equal(staticPermissionValue(normalizePermissionRule(true)), true);
  assert.equal(staticPermissionValue(normalizePermissionRule(false)), false);
  assert.equal(
    staticPermissionValue(
      normalizePermissionRule(
        ({ actor }: { actor: Actor }) => actor.role === "admin",
      ),
    ),
    undefined,
  );
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

test("checkResourceOperation defaults to denied when no rule is attached", async () => {
  const permissions = definePermissions<Actor, Post>();

  assert.deepEqual(
    await checkResourceOperation(permissions, "delete", {
      actor: { role: "viewer" },
    }),
    { allowed: false },
  );
});

test("default deny results are fresh objects", async () => {
  const permissions = definePermissions<Actor, Post>();
  const result = await checkAction(permissions, "archive", {
    actor: { role: "viewer" },
  });

  result.allowed = true;

  assert.deepEqual(
    await checkAction(permissions, "archive", { actor: { role: "viewer" } }),
    { allowed: false },
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

test("checkFieldAccess defaults to denied for fields with no matching rule", async () => {
  const permissions = definePermissions<Actor, Post>().field("salary", {
    read: false,
  });

  assert.deepEqual(
    await checkFieldAccess(permissions, "salary", "write", {
      actor: { role: "viewer" },
    }),
    { allowed: false },
  );
  assert.deepEqual(
    await checkFieldAccess(permissions, "title", "read", {
      actor: { role: "viewer" },
    }),
    { allowed: false },
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

test("checkAction defaults to denied when no rule is attached", async () => {
  const permissions = definePermissions<Actor, Post>();

  assert.deepEqual(
    await checkAction(permissions, "archive", { actor: { role: "viewer" } }),
    { allowed: false },
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
  const allow = () => true;

  runtime.resource.delete = allow;
  runtime.fields.salary!.read = allow;
  runtime.actions.archive = allow;
  assert.equal(allow(), true);

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
      allowed: false,
    },
  );
  assert.deepEqual(await checkAction(permissions, "archive", viewer), {
    allowed: false,
  });
});

test("resolveResourceSchema hides unreadable fields and locks unwritable ones", async () => {
  const post = defineResource("post", {
    fields: {
      title: text(),
      salary: text(),
    },
  });
  const permissions = definePermissions<Actor, Post>()
    .field("title", {
      read: true,
      write: true,
    })
    .field("salary", {
      read: ({ actor }) => actor.role === "admin",
      write: ({ actor }) => actor.role !== "viewer",
    });

  const resolved = await resolveResourceSchema(post.toSchema(), permissions, {
    actor: { role: "editor" },
  });

  assert.equal(resolved.fields.title.hidden, undefined);
  assert.equal(resolved.fields.title.readOnly, undefined);
  assert.equal(resolved.fields.salary.hidden, true);
  assert.equal(resolved.fields.salary.readOnly, undefined);
});

test("resolveResourceSchema never relaxes statically-set hidden/readOnly flags", async () => {
  const post = defineResource("post", {
    fields: {
      internalNote: text().hidden().readOnly(),
    },
  });
  const permissions = definePermissions<Actor, Post>().field("internalNote", {
    read: true,
    write: true,
  });

  const resolved = await resolveResourceSchema(post.toSchema(), permissions, {
    actor: { role: "admin" },
  });

  assert.equal(resolved.fields.internalNote.hidden, true);
  assert.equal(resolved.fields.internalNote.readOnly, true);
});

test("resolveResourceSchema leaves unmatched field nodes in the layout tree unchanged", async () => {
  const post = defineResource("post", {
    fields: {
      title: text(),
    },
  });
  const schema = post.toSchema();
  const unmatched = text().toSchema("ghost");
  const permissions = definePermissions<Actor, Post>().field("title", {
    read: true,
    write: true,
  });

  const resolved = await resolveResourceSchema(
    { ...schema, tree: [unmatched] },
    permissions,
    {
      actor: { role: "admin" },
    },
  );

  assert.equal(resolved.tree[0], unmatched);
});

test("resolveResourceSchema updates matching field nodes inside the layout tree, and leaves relationships alone", async () => {
  const author = defineResource("author", { fields: { name: text() } });
  const post = defineResource("post", {
    fields: { title: text(), salary: text() },
    relationships: { author: belongsTo(() => author) },
  }).form((f) => [f.section("Details", ["title", "salary", "author"])]);
  const permissions = definePermissions<Actor, Post>()
    .field("title", {
      read: true,
      write: true,
    })
    .field("salary", {
      read: false,
      write: true,
    });

  const resolved = await resolveResourceSchema(post.toSchema(), permissions, {
    actor: { role: "viewer" },
  });

  const section = resolved.tree[0];
  assert.ok(section?.type === "section");
  const [title, salary, authorNode] = section.children;
  assert.equal((title as { hidden?: boolean }).hidden, undefined);
  assert.equal((salary as { hidden?: boolean }).hidden, true);
  assert.deepEqual(authorNode, resolved.relationships.author);
});

test("resolveResourceSchema updates nested layout nodes with resolved field permissions", async () => {
  const post = defineResource("post", {
    fields: {
      title: text(),
      salary: text(),
      notes: text(),
    },
  }).form((f) => [
    f.section("Details", [f.grid(2, ["title", "salary"])]),
    f.tabs([{ title: "Notes", children: ["notes"] }]),
    f.wizard([{ title: "Review", children: ["salary"] }]),
    f.repeater("lineItems", ["notes"]),
    f.action("approve", { input: ["salary"] }),
    f.action("reject"),
  ]);
  const permissions = definePermissions<Actor, Post>()
    .field("title", {
      read: true,
      write: true,
    })
    .field("salary", {
      read: false,
      write: true,
    })
    .field("notes", {
      read: true,
      write: false,
    });

  const resolved = await resolveResourceSchema(post.toSchema(), permissions, {
    actor: { role: "viewer" },
  });

  const section = resolved.tree[0];
  assert.ok(section?.type === "section");
  const grid = section.children[0];
  assert.ok(grid?.type === "grid");
  const [title, salaryInGrid] = grid.children;
  assert.equal((title as { hidden?: boolean }).hidden, undefined);
  assert.equal((salaryInGrid as { hidden?: boolean }).hidden, true);

  const tabs = resolved.tree[1];
  assert.ok(tabs?.type === "tabs");
  const notesInTabs = tabs.tabs[0]!.children[0];
  assert.equal((notesInTabs as { readOnly?: boolean }).readOnly, true);

  const wizard = resolved.tree[2];
  assert.ok(wizard?.type === "wizard");
  const salaryInWizard = wizard.steps[0]!.children[0];
  assert.equal((salaryInWizard as { hidden?: boolean }).hidden, true);

  const repeater = resolved.tree[3];
  assert.ok(repeater?.type === "repeater");
  const notesInRepeater = repeater.children[0];
  assert.equal((notesInRepeater as { readOnly?: boolean }).readOnly, true);

  const approve = resolved.tree[4];
  assert.ok(approve?.type === "action");
  const salaryInput = approve.input![0];
  assert.equal((salaryInput as { hidden?: boolean }).hidden, true);

  const reject = resolved.tree[5];
  assert.deepEqual(reject, {
    type: "action",
    name: "reject",
    label: undefined,
    input: undefined,
  });
});

test("validateWritableFields reports a permission issue instead of running validation for unwritable fields", async () => {
  const permissions = definePermissions<Actor, Post>().field("salary", {
    write: false,
  });

  const result = await validateWritableFields(
    { salary: text().required().toSchema("salary") },
    { salary: undefined },
    permissions,
    { actor: { role: "viewer" } },
  );

  assert.deepEqual(result, {
    success: false,
    issues: [
      {
        path: ["salary"],
        message: 'You do not have permission to write to "salary".',
      },
    ],
  });
});

test("validateWritableFields surfaces the denying rule's custom reason", async () => {
  const permissions = definePermissions<Actor, Post>().field("salary", {
    write: () => ({ allowed: false, reason: "Only admins can edit salary." }),
  });

  const result = await validateWritableFields(
    { salary: text().toSchema("salary") },
    { salary: "100000" },
    permissions,
    { actor: { role: "editor" } },
  );

  assert.deepEqual(result, {
    success: false,
    issues: [{ path: ["salary"], message: "Only admins can edit salary." }],
  });
});

test("validateWritableFields runs normal field validation for writable fields", async () => {
  const permissions = definePermissions<Actor, Post>().field("title", {
    write: true,
  });

  assert.deepEqual(
    await validateWritableFields(
      { title: text().required().toSchema("title") },
      { title: undefined },
      permissions,
      { actor: { role: "editor" } },
    ),
    {
      success: false,
      issues: [{ path: ["title"], message: "This field is required." }],
    },
  );
  assert.deepEqual(
    await validateWritableFields(
      { title: text().required().toSchema("title") },
      { title: "Hello" },
      permissions,
      { actor: { role: "editor" } },
    ),
    { success: true, value: { title: "Hello" } },
  );
});

test("validateWritableFields omits absent optional fields without checking write access", async () => {
  const permissions = definePermissions<Actor, Post>()
    .field("title", {
      write: true,
    })
    .field("subtitle", {
      write: false,
    });

  assert.deepEqual(
    await validateWritableFields(
      {
        title: text().required().toSchema("title"),
        subtitle: text().optional().toSchema("subtitle"),
      },
      { title: "Hello" },
      permissions,
      { actor: { role: "editor" } },
    ),
    { success: true, value: { title: "Hello" } },
  );
});

test("validateWritableFields preserves explicit undefined values", async () => {
  const permissions = definePermissions<Actor, Post>().field("subtitle", {
    write: true,
  });

  assert.deepEqual(
    await validateWritableFields(
      { subtitle: text().optional().toSchema("subtitle") },
      { subtitle: undefined },
      permissions,
      { actor: { role: "editor" } },
    ),
    { success: true, value: { subtitle: undefined } },
  );
});
