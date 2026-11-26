# VeriKit

![VeriKit  TypeScript-first resource framework for building web applications](img/social-card.jpg)

**Define a resource once, get the rest for free.**

VeriKit is a TypeScript-first resource framework for CRUD-heavy applications.
Define fields, validation, relationships, permissions, and actions in one place,
then use that definition across your API, database adapter, typed client, forms,
and tables.

## 5-minute quickstart

Requires Node.js 24 or newer.

**1. Create an app.**

```sh
npm create verikit@latest my-app
cd my-app
npm run dev
```

Open http://localhost:3000. You have an admin panel for a sample `post`
resource, with search, sorting, and create, edit, and delete pages, backed by
a REST API at `/api/post` and a SQLite database.

**2. Add a resource.**

```sh
npx verikit make:resource Tag name:text color:select:red,green,blue
npm run db:generate
```

That writes `resources/tag.ts`, regenerates the database schema, and creates a
migration. The dev server restarts and a Tags page appears.

**3. Relate two resources.**

```sh
npx verikit make:resource Comment body:textarea post:belongsTo:post
npm run db:generate
```

The comment form gets a picker that lists posts by title.

**4. Lock a resource down.** In `server/permissions.ts`, replace a resource's
`"open"` with rules. Permissions fail closed, so this makes tags read-only:
anything without a rule, like creating or editing, is denied.

```ts
import { definePermissions } from "verikit";

// in the permissions map:
tag: definePermissions()
  .can("list", true)
  .can("read", true)
  .field("name", { read: true })
  .field("color", { read: true }),
```

For signed-in users, see [examples/waitlist-sqlite](examples/waitlist-sqlite),
which gives admins full access and the public a single create endpoint.

**5. Ship it.**

```sh
npm run build
npm start
```

`npm start` serves the API and the built panel on `PORT` (default 3000) with
the database at `DATABASE_PATH` (default `data/app.db`). Before deploying, read
the **Production** sections of the [`@verikit/server`](packages/server/README.md)
and [`@verikit/client`](packages/client/README.md) READMEs.

## Add to an existing app

```sh
npm install verikit
```

One package, with your framework and ORM installed alongside it (React:
`react react-dom @tanstack/react-query`; Drizzle: `drizzle-orm`). See
[packages/verikit](packages/verikit/README.md) for the full list. The scoped
`@verikit/*` packages are still published for finer-grained installs.

## Example

```ts
import { boolean, defineResource, text } from "verikit";

export const post = defineResource("post", {
  fields: {
    title: text().required(),
    published: boolean().default(false),
  },
});
```

That one definition is what `verikit/server` exposes over REST, `verikit/drizzle` or
`verikit/prisma` backs with a database, `verikit/client` consumes through a typed client, and
`verikit/react` renders as tables and forms. `verikit/react-panel` turns a list of
resources into a full admin panel with navigation and list, create, and edit pages:

```tsx
<Panel title="Acme" resources={[post, user]} />
```

One adapter factory stores every resource, and a `revision` column gives
resources with permissions safe concurrent updates automatically:

```ts
const api = createServer({
  adapter: drizzleAdapter(db, { tables }),
  resources: [{ resource: post, permissions: "open" }],
});
```

## Examples

- [examples/waitlist-sqlite](examples/waitlist-sqlite): a waitlist the public
  joins through the API and an admin manages in the panel. Covers permissions
  down to field level, a server action, sign-in, and API tests. It runs in CI.

## Docs

Guides and API reference: [verikit.dev](https://verikit.dev)

## Status

VeriKit is under active development. APIs may change.

---

Contributing? See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup.