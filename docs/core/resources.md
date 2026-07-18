---
sidebar_position: 1
title: Resources
---

# Resources

Resources are the central unit in Verikit. A resource combines fields, relationships, optional table/source metadata, arbitrary adapter metadata, and an optional form layout.

```ts
import { defineResource, text } from "@verikit/core";

const post = defineResource("post", {
  fields: {
    title: text().required(),
    slug: text().required(),
  },
  meta: {
    icon: "file-text",
  },
});

const schema = post.toSchema();
```

## `defineResource(name, config)`

```ts
const resource = defineResource("resourceName", {
  table: optionalTableReference,
  fields: {
    // fieldName: fieldBuilder
  },
  relationships: {
    // relationshipName: relationshipBuilder
  },
  meta: {
    // adapter-specific metadata
  },
});
```

The resource name must be stable. Adapters commonly use it for routing, lookup keys, API endpoints, and labels.

## Field and relationship names

Field names and relationship names share one namespace inside a resource. Verikit throws if a field and relationship use the same name.

```ts
defineResource("book", {
  fields: {
    author: text(),
  },
  relationships: {
    // Throws: "author" already exists as a field.
    author: belongsTo(() => authorResource),
  },
});
```

## `toSchema()`

Call `.toSchema()` to finalize a resource into a serializable schema.

The schema includes:

- `type: "resource"`
- `name`
- finalized `fields`
- finalized `relationships`
- a layout `tree`
- optional `meta`

```ts
const schema = post.toSchema();

console.log(schema.fields.title);
console.log(schema.tree);
```

The builder API is for authoring. The schema output is for adapters, validation, persistence mapping, and transport.
