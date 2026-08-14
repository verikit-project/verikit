import assert from "node:assert/strict";
import test from "node:test";
import {
  belongsTo,
  definePermissions,
  defineResource,
  hasMany,
  text,
} from "@verikit/core";
import { validateRelationshipReferences } from "../src/relationship-validation.js";
import { buildRouteTable } from "../src/routing/route-table.js";
import { createInMemoryAdapter } from "../src/testing/in-memory-adapter.js";

interface Actor {
  organizationId: string;
}

function setup(options: { withOrganization?: boolean } = {}) {
  const { withOrganization = true } = options;
  const organization = defineResource("organization", {
    fields: {
      name: text().required(),
      organizationId: text().required(),
    },
    access: {
      scope: ({ actor }) => ({ organizationId: actor.organizationId }),
    },
  });
  const project = defineResource("project", {
    fields: {
      title: text().required(),
      organizationId: text().required().label("Organization"),
    },
    relationships: (field) => ({
      organization: belongsTo(() => organization).via(field("organizationId")),
      // A hasMany relationship on the same resource, to prove it's ignored.
      subprojects: hasMany(() => organization),
      // An adapter-specific (non-string) foreign key reference, to prove
      // it's ignored too  there's no field name here to read a value from.
      legacyOwner: belongsTo(() => organization).via({ column: "owner_id" }),
    }),
  });
  const organizationPermissions = definePermissions<Actor>()
    .can("list", true)
    .can(
      "read",
      ({ actor, record }) =>
        (record as { organizationId: string }).organizationId ===
        actor.organizationId,
    )
    .field("name", { read: true })
    .field("organizationId", { read: true });

  const resources = [
    {
      resource: project,
      adapter: createInMemoryAdapter([]),
      permissions: "open" as const,
    },
    ...(withOrganization
      ? [
          {
            resource: organization,
            adapter: createInMemoryAdapter([
              { id: "one", name: "Acme", organizationId: "one" },
              { id: "two", name: "Other", organizationId: "two" },
            ]),
            permissions: organizationPermissions,
          },
        ]
      : []),
  ];
  const table = buildRouteTable(resources, "");
  const projectEntry = table.find(
    (entry) => entry.config.resource.name === "project",
  )!;

  return { table, projectEntry };
}

test("a resource with no relationships is a no-op", async () => {
  const post = defineResource("post", { fields: { title: text() } });
  const table = buildRouteTable(
    [{ resource: post, adapter: createInMemoryAdapter([]), permissions: "open" }],
    "",
  );

  const issues = await validateRelationshipReferences(
    table[0]!,
    table,
    { title: "x" },
    new Set(["title"]),
    { organizationId: "one" },
  );

  assert.deepEqual(issues, []);
});

test("a valid, in-scope, readable reference produces no issue", async () => {
  const { table, projectEntry } = setup();

  const issues = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: "one" },
    new Set(["organizationId"]),
    { organizationId: "one" },
  );

  assert.deepEqual(issues, []);
});

test("a foreign key not among the client-submitted fields is skipped, even with a value present", async () => {
  const { table, projectEntry } = setup();

  const issues = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: "two" },
    new Set(),
    { organizationId: "one" },
  );

  assert.deepEqual(issues, []);
});

test("a null or absent foreign key is left to ordinary field validation, not this check", async () => {
  const { table, projectEntry } = setup();

  const nullValue = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: null },
    new Set(["organizationId"]),
    { organizationId: "one" },
  );
  const absentValue = await validateRelationshipReferences(
    projectEntry,
    table,
    {},
    new Set(["organizationId"]),
    { organizationId: "one" },
  );

  assert.deepEqual(nullValue, []);
  assert.deepEqual(absentValue, []);
});

test("a nonexistent target id is reported as an invalid reference", async () => {
  const { table, projectEntry } = setup();

  const issues = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: "missing" },
    new Set(["organizationId"]),
    { organizationId: "one" },
  );

  assert.deepEqual(issues, [
    {
      path: ["organizationId"],
      message: "Organization does not exist or is not accessible.",
    },
  ]);
});

test("a real id outside the actor's scope is reported the same as a nonexistent one, closing the cross-tenant bypass", async () => {
  const { table, projectEntry } = setup();

  // "two" is a real organization, just not this actor's.
  const issues = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: "two" },
    new Set(["organizationId"]),
    { organizationId: "one" },
  );

  assert.deepEqual(issues, [
    {
      path: ["organizationId"],
      message: "Organization does not exist or is not accessible.",
    },
  ]);
});

test("an in-scope id the actor still can't read (denied by target permissions) is reported as invalid, not leaked", async () => {
  const organization = defineResource("organization", {
    fields: { name: text(), organizationId: text().required() },
  });
  const project = defineResource("project", {
    fields: { organizationId: text().required() },
    relationships: (field) => ({
      organization: belongsTo(() => organization).via(field("organizationId")),
    }),
  });
  const table = buildRouteTable(
    [
      { resource: project, adapter: createInMemoryAdapter([]), permissions: "open" },
      {
        resource: organization,
        adapter: createInMemoryAdapter([
          { id: "one", name: "Acme", organizationId: "one" },
        ]),
        permissions: definePermissions().can("read", false),
      },
    ],
    "",
  );
  const projectEntry = table.find((e) => e.config.resource.name === "project")!;

  const issues = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: "one" },
    new Set(["organizationId"]),
    {},
  );

  assert.deepEqual(issues, [
    {
      path: ["organizationId"],
      message: "organizationId does not exist or is not accessible.",
    },
  ]);
});

test("a relationship whose target resource isn't registered on this server fails closed", async () => {
  const { table, projectEntry } = setup({ withOrganization: false });

  const issues = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: "one" },
    new Set(["organizationId"]),
    { organizationId: "one" },
  );

  assert.deepEqual(issues, [
    {
      path: ["organizationId"],
      message: "Organization does not exist or is not accessible.",
    },
  ]);
});

test("hasMany relationships and adapter-specific (non-string) foreign keys are never checked", async () => {
  const { table, projectEntry } = setup();

  const issues = await validateRelationshipReferences(
    projectEntry,
    table,
    { organizationId: "one" },
    new Set(["organizationId", "subprojects", "legacyOwner"]),
    { organizationId: "one" },
  );

  assert.deepEqual(issues, []);
});
