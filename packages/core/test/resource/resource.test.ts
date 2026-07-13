import assert from "node:assert/strict";
import test from "node:test";
import { email, text } from "../../src/fields/index.js";
import { defineResource, Resource } from "../../src/resource/index.js";

test("defineResource composes fields into a schema with default tree ordering", () => {
  const resource = defineResource("user", {
    fields: {
      name: text().required(),
      email: email(),
    },
  });

  assert.ok(resource instanceof Resource);
  assert.equal(resource.name, "user");

  const schema = resource.toSchema();

  assert.equal(schema.type, "resource");
  assert.equal(schema.name, "user");
  assert.deepEqual(schema.fields.name, {
    type: "field",
    name: "name",
    fieldType: "text",
    required: true,
    nullable: false,
  });
  assert.equal(schema.fields.email.fieldType, "email");

  assert.deepEqual(schema.tree, [schema.fields.name, schema.fields.email]);
});

test("resource preserves table and meta references", () => {
  const table = { schema: "public", name: "users" };
  const meta = { icon: "user" };

  const resource = defineResource("user", {
    table,
    meta,
    fields: { name: text() },
  });

  assert.equal(resource.table, table);

  const schema = resource.toSchema();
  assert.equal(schema.meta, meta);
});

test("form() returns the resource instance for chaining", () => {
  const resource = defineResource("user", { fields: { name: text() } });
  const chained = resource.form((builder) => [builder.field("name")]);

  assert.equal(chained, resource);
});

test("form() overrides the default tree using section and grid layout helpers", () => {
  const resource = defineResource("user", {
    fields: {
      name: text().required(),
      email: email(),
    },
  }).form((builder) => [
    builder.section("Basic", ["name", "email"]),
    builder.grid(2, [builder.field("name"), "email"]),
  ]);

  const schema = resource.toSchema();

  assert.deepEqual(schema.tree, [
    {
      type: "section",
      title: "Basic",
      children: [schema.fields.name, schema.fields.email],
    },
    {
      type: "grid",
      columns: 2,
      children: [schema.fields.name, schema.fields.email],
    },
  ]);
});

test("layout builder field() returns the finalized field node by name", () => {
  const resource = defineResource("user", {
    fields: { name: text().label("Name") },
  }).form((builder) => [builder.field("name")]);

  const schema = resource.toSchema();

  assert.deepEqual(schema.tree, [schema.fields.name]);
});

test("section and grid accept nested schema nodes alongside field names", () => {
  const resource = defineResource("user", {
    fields: { name: text(), email: email() },
  }).form((builder) => [
    builder.section("Outer", ["name", builder.grid(2, ["email"])]),
  ]);

  const schema = resource.toSchema();

  assert.deepEqual(schema.tree, [
    {
      type: "section",
      title: "Outer",
      children: [
        schema.fields.name,
        {
          type: "grid",
          columns: 2,
          children: [schema.fields.email],
        },
      ],
    },
  ]);
});

test("layout builder returns undefined for unknown runtime field names", () => {
  const resource = defineResource("user", {
    fields: { name: text() },
  }).form((builder) => [builder.field("missing" as "name")]);

  assert.deepEqual(resource.toSchema().tree, [undefined]);
});
