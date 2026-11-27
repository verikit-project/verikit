# verikit

All of [Verikit](https://verikit.dev) in one install: define a resource once and
get its database table, REST API, typed client, forms, and admin panel.

```sh
npm install verikit
```

Starting a new app? `npm create verikit@latest` sets all of this up for you.

## Imports

| Import                | Contents                                            | Same as                                 |
| --------------------- | --------------------------------------------------- | --------------------------------------- |
| `verikit`             | `defineResource`, fields, permissions, `action`     | `@verikit/core` + `@verikit/runtime`    |
| `verikit/server`      | `createServer`, OpenAPI                             | `@verikit/server`                       |
| `verikit/server/testing` | In-memory adapter for tests                      | `@verikit/server/testing`               |
| `verikit/client`      | `createClient`                                      | `@verikit/client`                       |
| `verikit/drizzle`     | `drizzleAdapter`, `createDrizzleAdapter`            | `@verikit/drizzle`                      |
| `verikit/prisma`      | `createPrismaAdapter`                               | `@verikit/prisma`                       |
| `verikit/react`       | `VerikitProvider`, `ResourceTable`, `ResourceForm`  | `@verikit/react`                        |
| `verikit/react-panel` | `Panel`                                             | `@verikit/react-panel`                  |
| `verikit/vue`         | Vue components (install `@verikit/vue` too)         | `@verikit/vue`                          |
| `verikit/ui-core`     | Framework-neutral form and query helpers            | `@verikit/ui-core`                      |

The `verikit` command (`npx verikit make:resource ...`) comes with it.

Use either `verikit/*` or the `@verikit/*` packages in an app, not both: mixing
them can load two copies of a package.

## Your stack

Verikit doesn't install a UI framework, ORM, or CSS tool for you. Install the
ones you use:

| You use             | Also install                                                   |
| ------------------- | -------------------------------------------------------------- |
| React               | `react react-dom @tanstack/react-query`                        |
| Vue                 | `@verikit/vue vue @tanstack/vue-query`                         |
| Drizzle             | `drizzle-orm` and a driver, e.g. `better-sqlite3`              |
| Prisma              | `@prisma/client`                                               |
| The Tailwind theme  | `tailwindcss`                                                  |

The React UI ships with this package; Vue is separate so React apps don't
download it. Vue apps still download the React UI packages, so a Vue app that
cares about install size can use the `@verikit/*` packages instead.

## Styles

Import one CSS entry from your Tailwind CSS file. Each includes the theme and
tells Tailwind where Verikit's components are:

```css
@import "verikit/react.css"; /* React components and the panel */
@import "verikit/vue.css"; /* Vue components */
@import "verikit/theme.css"; /* theme only */
```
