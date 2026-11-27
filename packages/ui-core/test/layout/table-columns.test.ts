import assert from "node:assert/strict";
import test from "node:test";
import { belongsTo, defineResource, hasMany, text } from "@verikit/core";
import {
  needsRelationshipLabels,
  relationshipCellText,
  resourceColumnSpecs,
  type RelationshipColumnSpec,
} from "../../src/layout/table-columns.js";

const author = defineResource("author", { fields: { name: text() } });

const article = defineResource("article", {
  fields: {
    title: text(),
    authorId: text().label("Author id").tableHidden(),
    editorId: text().label("Editor"),
    secret: text().hidden(),
    notes: text().tableHidden(),
    tagId: text(),
  },
  relationships: (field) => ({
    author: belongsTo(() => author)
      .label("Written by")
      .displayField("name")
      .via(field("authorId")),
    editor: belongsTo(() => author).via(field("editorId")),
    // A second relationship on the same key doesn't add another column.
    coauthor: belongsTo(() => author).via(field("authorId")),
    // Not a field on this resource.
    owner: belongsTo(() => author).via(field("ownerId" as never)),
    // Adapter-specific key.
    tag: belongsTo(() => author).via({ column: "tag_id" }),
    comments: hasMany(() => author).via(field("tagId")),
  }),
});

test("resourceColumnSpecs puts each belongsTo column where its foreign key is", () => {
  assert.deepEqual(
    resourceColumnSpecs(article).map((spec) =>
      spec.kind === "field"
        ? `field:${spec.field.name}`
        : `relationship:${spec.name}:${spec.label}:${spec.foreignKey}`,
    ),
    [
      "field:title",
      "relationship:author:Written by:authorId",
      // Falls back to the foreign key's label.
      "relationship:editor:Editor:editorId",
      "field:tagId",
    ],
  );
});

test("resourceColumnSpecs for a detail view keeps tableHidden fields but not hidden ones", () => {
  assert.deepEqual(
    resourceColumnSpecs(article, { view: "detail" }).map((spec) =>
      spec.kind === "field" ? spec.field.name : spec.name,
    ),
    ["title", "author", "editor", "notes", "tagId"],
  );
});

test("resourceColumnSpecs accepts a schema and falls back to the relationship name for a header", () => {
  const schema = defineResource("post", {
    fields: { ownerId: text() },
    relationships: (field) => ({
      owner: belongsTo(() => author).via(field("ownerId")),
    }),
  }).toSchema();
  schema.fields.ownerId = {
    ...schema.fields.ownerId,
    label: undefined as never,
  };

  assert.deepEqual(resourceColumnSpecs(schema), [
    {
      kind: "relationship",
      name: "owner",
      label: "owner",
      foreignKey: "ownerId",
    },
  ]);
});

test("needsRelationshipLabels is true only with a relationship column that has a displayField", () => {
  assert.equal(needsRelationshipLabels(article), true);
  assert.equal(needsRelationshipLabels(article.toSchema()), true);
  assert.equal(
    needsRelationshipLabels(
      defineResource("post", {
        fields: { authorId: text() },
        relationships: (field) => ({
          author: belongsTo(() => author).via(field("authorId")),
        }),
      }),
    ),
    false,
  );
  assert.equal(needsRelationshipLabels(author), false);
});

test("relationshipCellText shows the label, else the raw key, else nothing", () => {
  const spec: RelationshipColumnSpec = {
    kind: "relationship",
    name: "author",
    label: "Author",
    foreignKey: "authorId",
  };
  const labels = { author: { "1": "Ada" } };

  assert.equal(relationshipCellText(labels, spec, { authorId: 1 }), "Ada");
  assert.equal(relationshipCellText(labels, spec, { authorId: "2" }), "2");
  assert.equal(relationshipCellText(undefined, spec, { authorId: "2" }), "2");
  assert.equal(relationshipCellText({}, spec, { authorId: "2" }), "2");
  assert.equal(relationshipCellText(labels, spec, { authorId: null }), "");
  assert.equal(relationshipCellText(labels, spec, {}), "");
});
