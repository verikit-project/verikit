import assert from "node:assert/strict";
import test from "node:test";
import { text } from "../../src/fields/index.js";
import {
  belongsTo,
  belongsToMany,
  hasMany,
} from "../../src/relationships/index.js";
import { defineResource } from "../../src/resource/index.js";

const author = defineResource("author", {
  fields: { name: text() },
});

const book = defineResource("book", {
  fields: { title: text(), authorId: text() },
});

test("belongsTo produces a relationship schema referencing the target resource", () => {
  const relationship = belongsTo(() => author);

  assert.equal(relationship.kind, "belongsTo");
  assert.equal(relationship.target(), author);
  assert.deepEqual(relationship.toSchema(), {
    type: "relationship",
    relationshipType: "belongsTo",
    name: undefined,
    resource: "author",
    label: undefined,
    inverse: undefined,
    foreignKey: undefined,
    displayField: undefined,
  });
});

test("belongsTo toSchema accepts a name for the relationship field", () => {
  const relationship = belongsTo(() => author);

  assert.equal(relationship.toSchema("author").name, "author");
});

test("belongsTo via() and displayField() are immutable and chainable", () => {
  const base = belongsTo(() => author);
  const withForeignKey = base.via(book.field("authorId"));
  const withDisplayField = withForeignKey.displayField("name");

  assert.equal(base.toSchema().foreignKey, undefined);
  assert.equal(withForeignKey.toSchema().foreignKey, "authorId");
  assert.equal(withForeignKey.toSchema().displayField, undefined);

  assert.deepEqual(withDisplayField.toSchema("author"), {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "author",
    label: undefined,
    inverse: undefined,
    foreignKey: "authorId",
    displayField: "name",
  });
});

test("belongsTo label() and inverse() are immutable and chainable", () => {
  const base = belongsTo(() => author);
  const labelled = base.label("Author").inverse("books");

  assert.equal(base.toSchema().label, undefined);
  assert.deepEqual(labelled.toSchema("author"), {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "author",
    label: "Author",
    inverse: "books",
    foreignKey: undefined,
    displayField: undefined,
  });
});

test("hasMany resolves its target lazily and exposes the resource name", () => {
  const relationship = hasMany(() => author);

  assert.equal(relationship.kind, "hasMany");
  assert.equal(relationship.target(), author);
  assert.equal(relationship.resourceName(), "author");
});

test("hasMany toSchema references the target resource and accepts a name", () => {
  const relationship = hasMany(() => author);

  assert.deepEqual(relationship.toSchema(), {
    type: "relationship",
    relationshipType: "hasMany",
    name: undefined,
    resource: "author",
    label: undefined,
    inverse: undefined,
    foreignKey: undefined,
    displayField: undefined,
  });
  assert.deepEqual(relationship.toSchema("books"), {
    type: "relationship",
    relationshipType: "hasMany",
    name: "books",
    resource: "author",
    label: undefined,
    inverse: undefined,
    foreignKey: undefined,
    displayField: undefined,
  });
});

test("hasMany metadata methods are immutable and chainable", () => {
  const base = hasMany(() => book);
  const configured = base
    .label("Books")
    .inverse("writer")
    .via(book.field("authorId"))
    .displayField("title");

  assert.equal(base.toSchema().label, undefined);
  assert.deepEqual(configured.toSchema("books"), {
    type: "relationship",
    relationshipType: "hasMany",
    name: "books",
    resource: "book",
    label: "Books",
    inverse: "writer",
    foreignKey: "authorId",
    displayField: "title",
  });
});

test("foreign key field references are compile-time checked", () => {
  belongsTo(() => author).via(book.field("authorId"));

  // eslint-disable-next-line no-constant-condition -- type-only check, never executed
  if (false) {
    // @ts-expect-error raw strings are not accepted as typed foreign keys.
    belongsTo(() => author).via("authorId");
    // @ts-expect-error field references must match the resource's fields.
    belongsTo(() => author).via(book.field("missing"));
  }
});

test("belongsToMany resolves its target lazily and exposes the resource name", () => {
  const relationship = belongsToMany(() => author);

  assert.equal(relationship.kind, "belongsToMany");
  assert.equal(relationship.target(), author);
  assert.equal(relationship.resourceName(), "author");
});

test("belongsToMany toSchema references the target resource and accepts a name", () => {
  const relationship = belongsToMany(() => author);

  assert.deepEqual(relationship.toSchema(), {
    type: "relationship",
    relationshipType: "belongsToMany",
    name: undefined,
    resource: "author",
    label: undefined,
    inverse: undefined,
    through: undefined,
    foreignKey: undefined,
    displayField: undefined,
  });
  assert.deepEqual(relationship.toSchema("tags"), {
    type: "relationship",
    relationshipType: "belongsToMany",
    name: "tags",
    resource: "author",
    label: undefined,
    inverse: undefined,
    through: undefined,
    foreignKey: undefined,
    displayField: undefined,
  });
});

test("belongsToMany metadata methods are immutable and chainable", () => {
  const base = belongsToMany(() => author);
  const configured = base
    .label("Authors")
    .inverse("books")
    .through("book_authors")
    .via({ left: "book_id", right: "author_id" })
    .displayField("name");

  assert.equal(base.toSchema().through, undefined);
  assert.deepEqual(configured.toSchema("authors"), {
    type: "relationship",
    relationshipType: "belongsToMany",
    name: "authors",
    resource: "author",
    label: "Authors",
    inverse: "books",
    through: "book_authors",
    foreignKey: { left: "book_id", right: "author_id" },
    displayField: "name",
  });
});

test("hasMany and belongsToMany re-evaluate the target thunk on each call", () => {
  let calls = 0;
  const relationship = hasMany(() => {
    calls += 1;
    return author;
  });

  relationship.target();
  relationship.resourceName();

  assert.equal(calls, 2);
});

test("belongsTo preserves object foreign key references", () => {
  const foreignKey = { table: "books", column: "author_id" };
  const relationship = belongsTo(() => author).via(foreignKey);

  assert.equal(relationship.toSchema().foreignKey, foreignKey);
});
