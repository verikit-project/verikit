import assert from "node:assert/strict";
import test from "node:test";
import { text } from "../src/fields/index.js";
import {
  belongsTo,
  belongsToMany,
  hasMany,
} from "../src/relationships/index.js";
import { defineResource } from "../src/resource/index.js";

const author = defineResource("author", {
  fields: { name: text() },
});

test("belongsTo produces a relationship schema referencing the target resource", () => {
  const relationship = belongsTo(() => author);

  assert.equal(relationship.target(), author);
  assert.deepEqual(relationship.toSchema(), {
    type: "relationship",
    relationshipType: "belongsTo",
    name: undefined,
    resource: "author",
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
  const withForeignKey = base.via("authorId");
  const withDisplayField = withForeignKey.displayField("name");

  assert.equal(base.toSchema().foreignKey, undefined);
  assert.equal(withForeignKey.toSchema().foreignKey, "authorId");
  assert.equal(withForeignKey.toSchema().displayField, undefined);

  assert.deepEqual(withDisplayField.toSchema("author"), {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "author",
    foreignKey: "authorId",
    displayField: "name",
  });
});

test("hasMany resolves its target lazily and exposes the resource name", () => {
  const relationship = hasMany(() => author);

  assert.equal(relationship.kind, "hasMany");
  assert.equal(relationship.target(), author);
  assert.equal(relationship.resourceName(), "author");
});

test("belongsToMany resolves its target lazily and exposes the resource name", () => {
  const relationship = belongsToMany(() => author);

  assert.equal(relationship.kind, "belongsToMany");
  assert.equal(relationship.target(), author);
  assert.equal(relationship.resourceName(), "author");
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
