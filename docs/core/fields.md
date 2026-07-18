---
sidebar_position: 2
title: Fields
---

# Fields

Fields describe the values on a resource and the metadata adapters need to render, validate, search, sort, or map those values.

```ts
import { boolean, email, number, select, text } from "@verikit/core";

const fields = {
  title: text().required().min(2).max(120).searchable(),
  email: email().required(),
  rating: number().min(1).max(5).step(1),
  status: select().options(["draft", "published"]).default("draft"),
  featured: boolean().default(false),
};
```

## Field helpers

| Helper | Field type | Notes |
| --- | --- | --- |
| `text()` | `text` | Single-line string field. Supports `.min()` and `.max()`. |
| `textarea()` | `textarea` | Multi-line string field. Supports `.min()` and `.max()`. |
| `email()` | `email` | String field with email-format validation. Supports `.min()` and `.max()`. |
| `number()` | `number` | Numeric field. Supports `.min()`, `.max()`, and `.step()`. |
| `select()` | `select` | Enumerated value field. Supports `.options()`. |
| `boolean()` | `boolean` | Boolean field. |
| `toggle()` | `boolean` | Alias for `boolean()`. |
| `date()` | `date` | Date-only field. |
| `datetime()` | `datetime` | Date-and-time field. |
| `file()` | `file` | File upload/reference field. Supports `.accept()`, `.maxSize()`, and `.multiple()`. |
| `image()` | `image` | Image upload/reference field. Defaults `accept` to `["image/*"]`. |
| `from(column)` | source helper | Adds consume-mode source metadata to another field. |

## Common modifiers

Every field builder supports these modifiers:

| Modifier | Purpose |
| --- | --- |
| `.label(label)` | Sets display copy for forms and tables. |
| `.description(description)` | Sets help text. |
| `.placeholder(placeholder)` | Sets empty-input copy. |
| `.required()` | Requires a non-null, non-undefined value. |
| `.optional()` | Allows `undefined`, but not `null`. |
| `.nullable()` | Allows `null` and marks the field not required. |
| `.default(value)` | Sets a form-level fallback value. |
| `.searchable()` | Marks the field as searchable. |
| `.sortable()` | Marks the field as sortable. |
| `.hidden()` | Hides the field from generated UI. |
| `.readOnly()` | Marks the field as display-only. |
| `.validation(schema)` | Attaches a Standard Schema-compatible validator. |
| `.meta(meta)` | Merges adapter-specific metadata. |

## Select options

Select fields accept primitive shorthand values or labelled option objects.

```ts
const status = select().options([
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
]);
```

Primitive values are converted to `{ label, value }` objects:

```ts
const role = select().options(["admin", "editor", "viewer"]);
```

## File and image fields

```ts
import { file, image } from "@verikit/core";

const avatar = image()
  .accept(["image/png", "image/jpeg"])
  .maxSize(2_000_000);

const attachments = file()
  .accept(["application/pdf", ".docx"])
  .multiple()
  .maxSize(10_000_000);
```

Upload transport, storage, and URL generation are intentionally adapter concerns.

## Consume-mode fields

Use `from(column)` when a resource field maps to an existing storage column.

```ts
import { from, text } from "@verikit/core";

const user = defineResource("user", {
  fields: {
    name: from(usersTable.name).as(text().required()),
    role: from(usersTable.role).options(["admin", "member"]),
  },
});
```

`from(column)` is not a field type. It adds `source: { mode: "consume", column }` metadata to a field schema.
