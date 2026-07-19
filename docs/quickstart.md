---
sidebar_position: 3
title: Quickstart
---

# Quickstart

This example defines authors and books, adds a relationship, customizes the form layout, and validates incoming values.

```ts
import {
  belongsTo,
  defineResource,
  email,
  hasMany,
  text,
  validateResource,
} from "@verikit/core";

const author = defineResource("author", {
  fields: {
    name: text().required().searchable(),
    email: email().required(),
  },
  relationships: {
    books: hasMany(() => book)
      .via("authorId")
      .displayField("title"),
  },
});

const book = defineResource("book", {
  fields: {
    title: text().required().min(2).searchable().sortable(),
    summary: text().optional(),
    authorId: text().required().hidden(),
  },
  relationships: {
    author: belongsTo(() => author)
      .via("authorId")
      .displayField("name"),
  },
}).form((layout) => [
  layout.section("Book", ["title", "summary", layout.relationship("author")]),
]);

const schema = book.toSchema();

const result = validateResource(schema.fields, {
  title: "The Analytical Engine",
  summary: undefined,
  authorId: "author_123",
});
```

## What happens here

`defineResource()` creates a typed resource builder.

Field helpers like `text()` and `email()` create field builders. Modifiers such as `.required()`, `.optional()`, `.searchable()`, and `.sortable()` add metadata and update the inferred value type.

Relationship helpers like `belongsTo()` and `hasMany()` describe how resources point at each other. Targets are provided as functions so resources can reference each other before both constants are initialized.

`.form()` adds a layout tree. If no form layout is provided, `toSchema()` uses a flat list of fields in declaration order.

`validateResource()` validates a value object against the finalized field schemas.
