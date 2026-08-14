import assert from "node:assert/strict";
import test from "node:test";
import {
  belongsTo,
  definePermissions,
  defineResource,
  hasMany,
  text,
} from "@verikit/core";
import { handleRelationshipPicker } from "../../src/handlers/relationship-picker.js";
import { buildRouteTable } from "../../src/routing/route-table.js";
import { createInMemoryAdapter } from "../../src/testing/in-memory-adapter.js";
import { verikitError } from "../fixtures.js";

interface Actor {
  organizationId: string;
}

function setup() {
  const organization = defineResource("organization", {
    fields: {
      name: text().required().searchable(),
      secret: text().searchable(),
      organizationId: text().required(),
    },
    access: {
      scope: ({ actor }) => ({ organizationId: actor.organizationId }),
    },
  });
  const project = defineResource("project", {
    fields: {
      name: text().required(),
      organizationId: text().required(),
    },
    relationships: (field) => ({
      organization: belongsTo(() => organization).via(field("organizationId")),
      organizations: hasMany(() => organization).via(field("organizationId")),
    }),
  });
  const organizationPermissions = definePermissions<Actor>()
    .can("list", true)
    .field("name", { read: true })
    .field("organizationId", { read: true });
  const table = buildRouteTable(
    [
      {
        resource: project,
        adapter: createInMemoryAdapter([], {}),
        permissions: "open" as const,
      },
      {
        resource: organization,
        adapter: createInMemoryAdapter(
          [
            {
              id: "one",
              name: "Acme",
              secret: "classified",
              organizationId: "one",
            },
            {
              id: "two",
              name: "Other",
              secret: "classified",
              organizationId: "two",
            },
          ],
          { searchableFields: ["name", "secret"] },
        ),
        permissions: organizationPermissions,
      },
    ],
    "",
  );
  const projectEntry = table.find(
    (entry) => entry.config.resource.name === "project",
  )!;

  return {
    table,
    ctx: {
      entry: projectEntry,
      actor: { organizationId: "one" },
      request: new Request("https://x/project/relationships/organization"),
      url: new URL(
        "https://x/project/relationships/organization?search=classified",
      ),
      maxBodyBytes: false as const,
    },
  };
}

test("relationship picker delegates to the target's scoped, permission-aware list", async () => {
  const { table, ctx } = setup();

  const response = await handleRelationshipPicker(ctx, table, "organization");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.meta.total, 0, "hidden searchable fields must not match");

  ctx.url = new URL("https://x/project/relationships/organization?search=acme");
  const readableResponse = await handleRelationshipPicker(
    ctx,
    table,
    "organization",
  );
  const readableBody = await readableResponse.json();
  assert.deepEqual(readableBody.data, [
    { id: "one", name: "Acme", organizationId: "one" },
  ]);
});

test("relationship picker hides unknown and non-belongs-to relationships", async () => {
  const { table, ctx } = setup();

  await assert.rejects(
    handleRelationshipPicker(ctx, table, "missing"),
    verikitError(404, "NOT_FOUND"),
  );
  await assert.rejects(
    handleRelationshipPicker(ctx, table, "organizations"),
    verikitError(404, "NOT_FOUND"),
  );
});

test("relationship picker hides a target resource that is not registered", async () => {
  const { table, ctx } = setup();
  const withoutOrganization = table.filter(
    (entry) => entry.config.resource.name !== "organization",
  );

  await assert.rejects(
    handleRelationshipPicker(ctx, withoutOrganization, "organization"),
    verikitError(404, "NOT_FOUND"),
  );
});
