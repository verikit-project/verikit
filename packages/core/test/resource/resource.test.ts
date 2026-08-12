import assert from "node:assert/strict";
import test from "node:test";
import { email, text, type AnyFieldBuilder } from "../../src/fields/index.js";
import {
  belongsTo,
  belongsToMany,
  hasMany,
} from "../../src/relationships/index.js";
import {
  defineResource,
  Resource,
  type InferResource,
} from "../../src/resource/index.js";

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

test("resource preserves table reference and snapshots meta", () => {
  const table = { schema: "public", name: "users" };
  const meta = { icon: "user" };

  const resource = defineResource("user", {
    table,
    meta,
    fields: { name: text() },
  });

  assert.equal(resource.table, table);

  const schema = resource.toSchema();
  assert.deepEqual(schema.meta, { icon: "user" });
  assert.notEqual(schema.meta, meta);
});

test("resource stores access rules but never serializes them via toSchema", () => {
  const access = {
    scope: ({ actor }: { actor: { id: string } }) => ({ ownerId: actor.id }),
    onCreate: ({ actor }: { actor: { id: string } }) => ({
      ownerId: actor.id,
    }),
  };

  const resource = defineResource("post", {
    access,
    fields: { name: text() },
  });

  assert.deepEqual(resource.access?.scope?.({ actor: { id: "42" } }), {
    ownerId: "42",
  });
  assert.deepEqual(resource.access?.onCreate?.({ actor: { id: "42" } }), {
    ownerId: "42",
  });
  assert.equal(
    "access" in resource.toSchema(),
    false,
    "toSchema() output must not include server-only access rules",
  );
});

test("resource without access config leaves access undefined", () => {
  const resource = defineResource("user", { fields: { name: text() } });

  assert.equal(resource.access, undefined);
});

test("resource snapshots caller-owned fields, relationships, and meta", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const fields: Record<string, AnyFieldBuilder> = { name: text() };
  const relationships = { author: belongsTo(() => author) };
  const meta = { icon: "user" };

  const resource = defineResource("book", {
    fields,
    relationships,
    meta,
  });

  fields.name = email();
  relationships.author = belongsTo(() => author).label("Changed");
  assert.equal(relationships.author.target(), author);
  meta.icon = "changed";

  const schema = resource.toSchema();

  assert.equal(schema.fields.name.fieldType, "text");
  assert.equal(schema.relationships.author.label, undefined);
  assert.equal(resource.relationships.author.target(), author);
  assert.deepEqual(schema.meta, { icon: "user" });
});

test("resource schema snapshots meta on each toSchema call", () => {
  const resource = defineResource("user", {
    fields: { name: text() },
    meta: { icon: "user" },
  });

  const schema = resource.toSchema();
  schema.meta!.icon = "changed";

  assert.deepEqual(resource.toSchema().meta, { icon: "user" });
});

test("form() returns a new resource instance for chaining", () => {
  const resource = defineResource("user", { fields: { name: text() } });
  const chained = resource.form((builder) => [builder.field("name")]);

  assert.notEqual(chained, resource);
  assert.deepEqual(resource.toSchema().tree, [resource.toSchema().fields.name]);
  assert.deepEqual(chained.toSchema().tree, [chained.toSchema().fields.name]);
});

test("resource names must be non-empty", () => {
  assert.throws(
    () => defineResource("", { fields: { name: text() } }),
    /Resource names must be non-empty strings\./,
  );
  assert.throws(
    () => defineResource("   ", { fields: { name: text() } }),
    /Resource names must be non-empty strings\./,
  );
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

test("grid columns must be positive integers", () => {
  const resource = defineResource("user", {
    fields: { name: text() },
  });

  assert.throws(
    () => resource.form((builder) => [builder.grid(0, ["name"])]).toSchema(),
    /Grid columns must be a positive integer\./,
  );
  assert.throws(
    () =>
      resource
        .form((builder) => [builder.grid(Number.NaN, ["name"])])
        .toSchema(),
    /Grid columns must be a positive integer\./,
  );
});

test("layout builder throws for unknown runtime field names", () => {
  const resource = defineResource("user", {
    fields: { name: text() },
  }).form((builder) => [builder.field("missing" as "name")]);

  assert.throws(
    () => resource.toSchema(),
    /Unknown field "missing" in resource layout\./,
  );
});

test("layout builder throws for bare string children matching neither a field nor a relationship", () => {
  const resource = defineResource("user", {
    fields: { name: text() },
  }).form((builder) => [builder.section("Basic", ["missing" as "name"])]);

  assert.throws(
    () => resource.toSchema(),
    /Unknown layout child "missing" in resource layout\./,
  );
});

test("resource without relationships defaults to an empty relationships map", () => {
  const resource = defineResource("user", { fields: { name: text() } });
  const schema = resource.toSchema();

  assert.deepEqual(resource.relationships, {});
  assert.deepEqual(schema.relationships, {});
});

test("relationships are composed into the schema with names assigned from their key", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const book = defineResource("book", {
    fields: { title: text(), authorId: text() },
    relationships: (field) => ({
      author: belongsTo(() => author).via(field("authorId")),
    }),
  });

  const schema = book.toSchema();

  assert.equal(book.relationships.author.target(), author);
  assert.deepEqual(schema.relationships.author, {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "author",
    label: undefined,
    inverse: undefined,
    foreignKey: "authorId",
    displayField: undefined,
  });
});

test("resource preserves multiple relationship kinds", () => {
  const book = defineResource("book", { fields: { title: text() } });
  const tag = defineResource("tag", { fields: { label: text() } });
  const author = defineResource("author", {
    fields: { name: text() },
    relationships: {
      books: hasMany(() => book),
      tags: belongsToMany(() => tag),
    },
  });

  const schema = author.toSchema();

  assert.equal(author.relationships.books.target(), book);
  assert.equal(author.relationships.tags.target(), tag);
  assert.deepEqual(schema.relationships.books, {
    type: "relationship",
    relationshipType: "hasMany",
    name: "books",
    resource: "book",
    label: undefined,
    inverse: undefined,
    foreignKey: undefined,
    displayField: undefined,
  });
  assert.deepEqual(schema.relationships.tags, {
    type: "relationship",
    relationshipType: "belongsToMany",
    name: "tags",
    resource: "tag",
    label: undefined,
    inverse: undefined,
    through: undefined,
    foreignKey: undefined,
    displayField: undefined,
  });
});

test("resources reject duplicate field and relationship names", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const relationship = belongsTo(() => author);

  assert.equal(relationship.target(), author);

  assert.throws(
    () =>
      defineResource("book", {
        fields: { author: text() },
        relationships: { author: relationship },
      }),
    /cannot define both a field and relationship named "author"/,
  );
});

test("InferResource includes field values and relationship values", () => {
  const book = defineResource("book", { fields: { title: text().required() } });
  const author = defineResource("author", {
    fields: { name: text().required() },
    relationships: {
      books: hasMany(() => book),
      featuredBook: belongsTo(() => book),
      taggedBooks: belongsToMany(() => book),
    },
  });
  const inferred: InferResource<typeof author> = {
    name: "Ada",
    books: [{ title: "Notes" }],
    featuredBook: { title: "Notes" },
    taggedBooks: [{ title: "Notes" }],
  };

  assert.equal(author.name, "author");
  assert.equal(author.relationships.books.target(), book);
  assert.equal(author.relationships.featuredBook.target(), book);
  assert.equal(author.relationships.taggedBooks.target(), book);
  assert.equal(inferred.name, "Ada");
  assert.equal(inferred.books[0]?.title, "Notes");
  assert.equal(inferred.featuredBook?.title, "Notes");
  assert.equal(inferred.taggedBooks.length, 1);
});

test("layout builder relationship() returns the finalized relationship node by name", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const book = defineResource("book", {
    fields: { title: text() },
    relationships: { author: belongsTo(() => author) },
  }).form((builder) => [
    builder.field("title"),
    builder.relationship("author"),
  ]);

  const schema = book.toSchema();

  assert.deepEqual(schema.tree, [
    schema.fields.title,
    schema.relationships.author,
  ]);
});

test("layout builder throws for unknown runtime relationship names", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const book = defineResource("book", {
    fields: { title: text() },
    relationships: { author: belongsTo(() => author) },
  }).form((builder) => [builder.relationship("missing" as "author")]);

  assert.throws(
    () => book.toSchema(),
    /Unknown relationship "missing" in resource layout\./,
  );
});

test("section and grid accept relationship names alongside field names", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const book = defineResource("book", {
    fields: { title: text() },
    relationships: { author: belongsTo(() => author) },
  }).form((builder) => [builder.section("Details", ["title", "author"])]);

  const schema = book.toSchema();

  assert.deepEqual(schema.tree, [
    {
      type: "section",
      title: "Details",
      children: [schema.fields.title, schema.relationships.author],
    },
  ]);
});

test("tabs() builds a tabs node resolving field and relationship names per tab", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const book = defineResource("book", {
    fields: { title: text(), summary: text() },
    relationships: { author: belongsTo(() => author) },
  }).form((builder) => [
    builder.tabs([
      { title: "Main", children: ["title", "author"] },
      { title: "Extra", children: ["summary"] },
    ]),
  ]);

  const schema = book.toSchema();

  assert.deepEqual(schema.tree, [
    {
      type: "tabs",
      tabs: [
        {
          title: "Main",
          children: [schema.fields.title, schema.relationships.author],
        },
        { title: "Extra", children: [schema.fields.summary] },
      ],
    },
  ]);
});

test("wizard() builds a wizard node resolving field names per step", () => {
  const resource = defineResource("user", {
    fields: { name: text(), email: email() },
  }).form((builder) => [
    builder.wizard([
      { title: "Identity", children: ["name"] },
      { title: "Contact", children: ["email"] },
    ]),
  ]);

  const schema = resource.toSchema();

  assert.deepEqual(schema.tree, [
    {
      type: "wizard",
      steps: [
        { title: "Identity", children: [schema.fields.name] },
        { title: "Contact", children: [schema.fields.email] },
      ],
    },
  ]);
});

test("repeater() builds a repeater node with resolved children", () => {
  const resource = defineResource("invoice", {
    fields: { description: text(), amount: text() },
  }).form((builder) => [
    builder.repeater("lineItems", ["description", "amount"]),
  ]);

  const schema = resource.toSchema();

  assert.deepEqual(schema.tree, [
    {
      type: "repeater",
      name: "lineItems",
      children: [schema.fields.description, schema.fields.amount],
    },
  ]);
});

test("action() builds an action node with optional label and resolved input", () => {
  const resource = defineResource("invoice", {
    fields: { amount: text() },
  }).form((builder) => [
    builder.action("approve", { label: "Approve", input: ["amount"] }),
    builder.action("reject"),
  ]);

  const schema = resource.toSchema();

  assert.deepEqual(schema.tree, [
    {
      type: "action",
      name: "approve",
      label: "Approve",
      input: [schema.fields.amount],
    },
    {
      type: "action",
      name: "reject",
      label: undefined,
      input: undefined,
    },
  ]);
});

test("repeater and action names must be non-empty", () => {
  const resource = defineResource("invoice", {
    fields: { amount: text() },
  });

  assert.throws(
    () =>
      resource.form((builder) => [builder.repeater("", ["amount"])]).toSchema(),
    /Repeater names must be non-empty strings\./,
  );
  assert.throws(
    () => resource.form((builder) => [builder.action("   ")]).toSchema(),
    /Action names must be non-empty strings\./,
  );
});
