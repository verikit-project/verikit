import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../../src/compiler/index.js";
import { text } from "../../src/fields/index.js";
import {
  belongsTo,
  belongsToMany,
  hasMany,
} from "../../src/relationships/index.js";
import { defineResource } from "../../src/resource/index.js";

test("compile resolves valid relationships and returns a name-keyed graph", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const book = defineResource("book", {
    fields: { title: text(), authorId: text() },
    relationships: (field) => ({
      author: belongsTo(() => author).via(field("authorId")),
    }),
  });

  const result = compile([author, book]);

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(Object.keys(result.graph.resources).sort(), [
      "author",
      "book",
    ]);
    assert.equal(
      result.graph.resources.book?.relationships.author?.resource,
      "author",
    );
  }
});

test("compile reports duplicate resource names without evaluating relationships", () => {
  const first = defineResource("post", { fields: { title: text() } });
  const second = defineResource("post", { fields: { title: text() } });

  const result = compile([first, second]);

  assert.deepEqual(result, {
    success: false,
    issues: [{ resource: "post", message: 'Duplicate resource name "post".' }],
  });
});

test("compile reports relationships targeting resources outside the compiled set", () => {
  const ghost = defineResource("ghost", { fields: { note: text() } });
  const haunted = defineResource("haunted", {
    fields: { title: text() },
    relationships: { owner: belongsTo(() => ghost) },
  });

  const result = compile([haunted]);

  assert.deepEqual(result, {
    success: false,
    issues: [
      {
        resource: "haunted",
        relationship: "owner",
        message: 'Relationship "owner" references unknown resource "ghost".',
      },
    ],
  });
});

test("compile reports unknown foreign key fields for belongsTo, checked against the owning resource", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const book = defineResource("book", {
    fields: { title: text() },
    relationships: {
      author: belongsTo(() => author).via(author.field("name")),
    },
  });

  const result = compile([author, book]);

  assert.deepEqual(result, {
    success: false,
    issues: [
      {
        resource: "book",
        relationship: "author",
        message:
          'Relationship "author" references unknown field "name" on resource "book".',
      },
    ],
  });
});

test("compile reports unknown foreign key fields for hasMany, checked against the target resource", () => {
  const tag = defineResource("tag", { fields: { label: text() } });
  const post = defineResource("post", {
    fields: { title: text() },
    relationships: (field) => ({
      tags: hasMany(() => tag).via(field("title")),
    }),
  });

  const result = compile([post, tag]);

  assert.deepEqual(result, {
    success: false,
    issues: [
      {
        resource: "post",
        relationship: "tags",
        message:
          'Relationship "tags" references unknown field "title" on resource "tag".',
      },
    ],
  });
});

test("compile reports unknown through resources for belongsToMany", () => {
  const tag = defineResource("tag", { fields: { label: text() } });
  const post = defineResource("post", {
    fields: { title: text() },
    relationships: {
      tags: belongsToMany(() => tag).through("missing_join"),
    },
  });

  const result = compile([post, tag]);

  assert.deepEqual(result, {
    success: false,
    issues: [
      {
        resource: "post",
        relationship: "tags",
        message:
          'Relationship "tags" references unknown through resource "missing_join".',
      },
    ],
  });
});

test("compile skips foreign key validation for adapter-specific (non-string) foreign keys", () => {
  const tag = defineResource("tag", { fields: { label: text() } });
  const post = defineResource("post", {
    fields: { title: text() },
    relationships: {
      tags: belongsToMany(() => tag).via({
        left: "post_id",
        right: "tag_id",
      }),
    },
  });

  const result = compile([post, tag]);

  assert.equal(result.success, true);
});
