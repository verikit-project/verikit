---
sidebar_position: 5
title: Validation
---

# Validation

Verikit validates finalized field schemas with `validateField()`, `validateFieldAsync()`, `validateResource()`, and `validateResourceAsync()`.

```ts
import { defineResource, email, text, validateResource } from "@verikit/core";

const user = defineResource("user", {
  fields: {
    name: text().required().min(2),
    email: email().required(),
  },
});

const schema = user.toSchema();

const result = validateResource(schema.fields, {
  name: "Ada",
  email: "ada@example.com",
});
```

## Result shape

Validation returns a discriminated result.

```ts
type ValidationResult<TValue = unknown> =
  | { success: true; value: TValue }
  | { success: false; issues: ValidationIssue[] };

type ValidationIssue = {
  path: (string | number)[];
  message: string;
};
```

Resource validation prefixes field-level issues with the field name.

## Built-in checks

Verikit validates built-in field constraints:

| Field type | Checks |
| --- | --- |
| `text`, `textarea` | string type, `minLength`, `maxLength` |
| `email` | string type, email shape, `minLength`, `maxLength` |
| `number` | number type, finite number, `min`, `max`, `step` |
| `select` | allowed option values |
| `boolean` | boolean type |
| `date`, `datetime` | date/string date values |
| `file`, `image` | file reference/upload shape, `accept`, `maxSize`, `multiple` |

Required, optional, nullable, and default values are handled before type-specific checks.

## Standard Schema validators

Attach richer validation with `.validation()`. Verikit accepts Standard Schema-compatible validators and also supports common `parse()` and `safeParse()` shapes.

```ts
import { text } from "@verikit/core";
import { z } from "zod";

const slug = text()
  .required()
  .validation(z.string().regex(/^[a-z0-9-]+$/));
```

Use the async validation functions when custom validators can return promises:

```ts
const result = await validateResourceAsync(schema.fields, values);
```

## Relationships

`validateResource()` validates only `schema.fields`. Relationships describe resource structure and adapter behavior, not the submitted scalar field payload.
