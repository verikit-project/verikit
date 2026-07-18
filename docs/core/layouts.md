---
sidebar_position: 4
title: Layouts
---

# Layouts

Layouts describe how a resource should be arranged by adapters. They are generated with `.form()` and stored in the resource schema's `tree`.

If you do not define a form layout, Verikit uses a flat list of finalized fields in declaration order.

## Form layout

```ts
const book = defineResource("book", {
  fields: {
    title: text().required(),
    summary: textarea().optional(),
    publishedAt: date().optional(),
  },
}).form((layout) => [
  layout.section("Book", [
    "title",
    "summary",
    layout.grid(2, ["publishedAt"]),
  ]),
]);
```

The layout factory receives a `ResourceLayoutBuilder`. Children can be field names, relationship names, or literal schema nodes.

## Layout helpers

| Helper | Purpose |
| --- | --- |
| `layout.field(name)` | Resolves a field into its finalized field node. |
| `layout.relationship(name)` | Resolves a relationship into its finalized relationship node. |
| `layout.section(title, children)` | Groups children under a titled section. |
| `layout.grid(columns, children)` | Groups children into a fixed-column grid. |
| `layout.tabs(tabs)` | Creates titled tabs, each with its own children. |
| `layout.wizard(steps)` | Creates a step sequence. |
| `layout.repeater(name, children)` | Creates a repeatable child group. |
| `layout.action(name, options)` | Adds an action node with optional input children. |

## Tabs

```ts
const product = defineResource("product", {
  fields: {
    name: text().required(),
    description: textarea().optional(),
    sku: text().required(),
    price: number().required().min(0),
  },
}).form((layout) => [
  layout.tabs([
    {
      title: "Details",
      children: ["name", "description"],
    },
    {
      title: "Commerce",
      children: ["sku", "price"],
    },
  ]),
]);
```

## Actions in layouts

Action nodes allow adapters to place named actions alongside fields.

```ts
const order = defineResource("order", {
  fields: {
    status: text().required(),
    note: textarea().optional(),
  },
}).form((layout) => [
  layout.section("Order", ["status", "note"]),
  layout.action("refund", {
    label: "Refund order",
    input: ["note"],
  }),
]);
```

The resource layout only references an action by name. Define executable behavior with `@verikit/runtime`.
