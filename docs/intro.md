---
sidebar_position: 1
title: Introduction
---

# Verikit

Verikit is a TypeScript resource framework for describing data resources, fields, relationships, form layouts, validation, and runtime actions in reusable schemas.

It is designed for projects that want one typed resource definition to drive multiple layers of an application:

- form rendering
- table and detail views
- validation
- relationship metadata
- adapter-specific UI metadata
- runtime workflows and actions

## Packages

Verikit is split into focused packages:

| Package | Purpose |
| --- | --- |
| `@verikit/core` | Resource builders, field builders, relationships, layouts, and validation helpers. |
| `@verikit/runtime` | Runtime action builders and execution helpers for resource workflows. |

## The basic shape

```ts
import { defineResource, email, text, validateResource } from "@verikit/core";

const user = defineResource("user", {
  fields: {
    name: text().required(),
    email: email().required(),
  },
});

const schema = user.toSchema();

const result = validateResource(schema.fields, {
  name: "Ada Lovelace",
  email: "ada@example.com",
});
```

Resource definitions stay fluent and type-aware while you are building them. Calling `.toSchema()` produces a serializable schema that adapters can consume.

## When to use Verikit

Use Verikit when you want to define resource metadata once and reuse it across UI, validation, and runtime workflow code.

It is a good fit for admin panels, internal tools, form-heavy apps, resource explorers, schema-driven interfaces, and adapter libraries.

## Current status

Verikit is under active development. APIs may change before a stable release.
