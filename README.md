# VeriKit

![VeriKit  TypeScript-first resource framework for building web applications](img/social-card.jpg)

**Define a resource once, get the rest for free.**

VeriKit is a TypeScript-first resource framework for CRUD-heavy applications.
Define fields, validation, relationships, permissions, and actions in one place,
then use that definition across your API, database adapter, typed client, forms,
and tables.

## Quick start

```sh
npm create verikit@latest my-app
cd my-app
npm run dev
```

You get a working app at http://localhost:3000: React, Hono, Drizzle, and SQLite,
with a sample resource you can search, create, edit, and delete.

## Example

```ts
import { boolean, defineResource, text } from "@verikit/core";

export const post = defineResource("post", {
  fields: {
    title: text().required(),
    published: boolean().default(false),
  },
});
```

That one definition is what `@verikit/server` exposes over REST, `@verikit/drizzle` or
`@verikit/prisma` backs with a database, `@verikit/client` consumes through a typed client, and
`@verikit/react` renders as tables and forms.

## Docs

Guides and API reference: [verikit.dev](https://verikit.dev)

## Status

VeriKit is under active development. APIs may change.

---

Contributing? See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup.