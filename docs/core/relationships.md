---
sidebar_position: 3
title: Relationships
---

# Relationships

Relationships describe how resources connect. They are schema metadata for adapters and inferred resource types; they do not validate field payloads directly.

```ts
import { belongsTo, defineResource, hasMany, text } from "@verikit/core";

const author = defineResource("author", {
  fields: {
    id: text().required().hidden(),
    name: text().required(),
  },
  relationships: {
    books: hasMany(() => book).via("authorId").displayField("title"),
  },
});

const book = defineResource("book", {
  fields: {
    id: text().required().hidden(),
    title: text().required(),
    authorId: text().required().hidden(),
  },
  relationships: {
    author: belongsTo(() => author).via("authorId").displayField("name"),
  },
});
```

Targets are functions so two resources can refer to each other before both definitions have been evaluated.

## Relationship types

| Helper | Schema `relationshipType` | Value shape |
| --- | --- | --- |
| `belongsTo(() => resource)` | `belongsTo` | target resource or `null` |
| `hasMany(() => resource)` | `hasMany` | array of target resources |
| `belongsToMany(() => resource)` | `belongsToMany` | array of target resources |

## Relationship modifiers

All relationship builders support:

| Modifier | Purpose |
| --- | --- |
| `.label(label)` | Sets display copy. |
| `.inverse(name)` | Names the corresponding relationship on the target resource. |
| `.via(foreignKey)` | Stores the foreign key or column reference. |
| `.displayField(name)` | Names the target field adapters should display. |

`belongsToMany()` also supports:

| Modifier | Purpose |
| --- | --- |
| `.through(resourceName)` | Names the join/through resource used to link the two sides. |

## Many-to-many example

```ts
import { belongsToMany, defineResource, text } from "@verikit/core";

const tag = defineResource("tag", {
  fields: {
    name: text().required(),
  },
});

const article = defineResource("article", {
  fields: {
    title: text().required(),
  },
  relationships: {
    tags: belongsToMany(() => tag)
      .through("articleTag")
      .displayField("name"),
  },
});
```
