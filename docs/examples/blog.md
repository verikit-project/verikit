---
sidebar_position: 1
title: Blog Resources
---

# Blog Resources

This example models authors, posts, and tags.

```ts
import {
  belongsTo,
  belongsToMany,
  date,
  defineResource,
  email,
  hasMany,
  select,
  text,
  textarea,
} from "@verikit/core";

export const author = defineResource("author", {
  fields: {
    id: text().required().hidden(),
    name: text().required().searchable(),
    email: email().required(),
  },
  relationships: {
    posts: hasMany(() => post)
      .via("authorId")
      .displayField("title"),
  },
});

export const tag = defineResource("tag", {
  fields: {
    id: text().required().hidden(),
    name: text().required().searchable(),
  },
  relationships: {
    posts: belongsToMany(() => post)
      .through("postTag")
      .displayField("title"),
  },
});

export const post = defineResource("post", {
  fields: {
    id: text().required().hidden(),
    title: text().required().min(2).max(120).searchable().sortable(),
    slug: text().required().searchable(),
    excerpt: textarea().optional().max(240),
    body: textarea().required(),
    status: select().options(["draft", "review", "published"]).default("draft"),
    publishedAt: date().nullable().sortable(),
    authorId: text().required().hidden(),
  },
  relationships: {
    author: belongsTo(() => author)
      .via("authorId")
      .displayField("name"),
    tags: belongsToMany(() => tag)
      .through("postTag")
      .displayField("name"),
  },
}).form((layout) => [
  layout.section("Post", ["title", "slug", "excerpt", "body"]),
  layout.grid(2, ["status", "publishedAt"]),
  layout.section("Relationships", [
    layout.relationship("author"),
    layout.relationship("tags"),
  ]),
]);
```

## Schema output

```ts
const postSchema = post.toSchema();

console.log(postSchema.fields.title.fieldType);
console.log(postSchema.relationships.author.relationshipType);
console.log(postSchema.tree);
```

Adapters can render forms from `tree`, table columns from `fields`, and relationship controls from `relationships`.
