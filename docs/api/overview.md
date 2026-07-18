---
sidebar_position: 1
title: API Overview
---

# API Overview

This page summarizes the public API exported by Verikit packages. For full generated symbol documentation, pair Docusaurus with TypeDoc.

## `@verikit/core`

`@verikit/core` exports resource, field, relationship, and validation APIs.

### Resource APIs

| Export | Purpose |
| --- | --- |
| `defineResource()` | Creates a typed resource builder. |
| `Resource` | Immutable resource definition class. |
| `ResourceLayoutBuilder` | Layout helper passed to `.form()` factories. |
| `InferResource<T>` | Infers the runtime resource value shape. |
| `InferResourceFields<T>` | Infers the plain field value shape. |

### Field APIs

| Export | Purpose |
| --- | --- |
| `text()` | Creates a single-line text field. |
| `textarea()` | Creates a multi-line text field. |
| `email()` | Creates an email field. |
| `number()` | Creates a number field. |
| `select()` | Creates a select field. |
| `boolean()` | Creates a boolean field. |
| `toggle` | Alias for `boolean()`. |
| `date()` | Creates a date field. |
| `datetime()` | Creates a datetime field. |
| `file()` | Creates a file field. |
| `image()` | Creates an image field. |
| `from()` | Adds consume-mode source metadata. |
| `FieldBuilder` | Base fluent field builder. |
| `InferField<T>` | Infers a field builder's value type. |

### Relationship APIs

| Export | Purpose |
| --- | --- |
| `belongsTo()` | Creates a belongs-to relationship. |
| `hasMany()` | Creates a has-many relationship. |
| `belongsToMany()` | Creates a many-to-many relationship. |

### Validation APIs

| Export | Purpose |
| --- | --- |
| `validateField()` | Validates one field synchronously. |
| `validateFieldAsync()` | Validates one field asynchronously. |
| `validateResource()` | Validates a values object against resource fields synchronously. |
| `validateResourceAsync()` | Validates a values object against resource fields asynchronously. |

## `@verikit/runtime`

`@verikit/runtime` exports action builder and execution APIs.

| Export | Purpose |
| --- | --- |
| `action()` | Creates an action builder. |
| `ActionBuilder` | Fluent action builder class. |
| `runAction()` | Executes an action with availability, validation, handler, hooks, and result handling. |
| `InferActionInput<T>` | Infers validated action input from an action builder. |

## Generated API docs

Use TypeDoc for complete symbol-level docs. A typical setup is:

```sh
pnpm add -D typedoc typedoc-plugin-markdown
```

Then add a `typedoc.json` file:

```json
{
  "entryPoints": [
    "packages/core/src/index.ts",
    "packages/runtime/src/index.ts"
  ],
  "out": "docs/api/generated",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none"
}
```

Generate the reference pages before building Docusaurus:

```sh
pnpm exec typedoc
```
