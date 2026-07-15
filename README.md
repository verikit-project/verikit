# Verikit

A TypeScript resource framework for describing data resources, fields, relationships, layouts, and validation in one reusable schema.

Website: [verikit.dev](https://verikit.dev)

## Packages

- `@verikit/core` - resource builders, field builders, relationship schemas, layout helpers, and validation utilities.

## Install

```sh
pnpm add @verikit/core
```

## Example

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
    name: text().required(),
    email: email().required(),
  },
});

const book = defineResource("book", {
  fields: {
    title: text().required().min(2),
    summary: text().optional(),
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
});
```

## Core Features

- Fluent field builders for text, email, number, boolean, date, select, file, and image fields.
- Resource schemas with fields, relationships, metadata, and form layout trees.
- Relationship builders for `belongsTo`, `hasMany`, and `belongsToMany`.
- Layout helpers for fields, relationships, sections, grids, tabs, wizards, repeaters, and actions.
- Field and resource validation with sync and async validator support.
- Standard Schema-style validation support for tools such as Zod, Valibot, and ArkType.

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm verify
```

## Status

Verikit is under active development. APIs may change before a stable release.
