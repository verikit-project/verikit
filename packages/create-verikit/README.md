# create-verikit

Create a [Verikit](https://verikit.dev) app with one command.

```sh
npm create verikit@latest my-app
cd my-app
npm run dev
```

Open http://localhost:3000 to see an admin screen with a searchable table and
create, edit, and delete forms, all generated from a single resource definition.

Also works with `pnpm create verikit`, `yarn create verikit`, and
`bun create verikit`. The package manager you run it with installs the
dependencies.

## What you get

- **React + Vite** UI using `@verikit/react`'s `ResourceTable` and forms
- **Hono** server exposing each resource at `/api/<resource>`
- **Drizzle + SQLite**, migrated and seeded automatically on first run
- One port and one command (`npm run dev`) for the API and UI together

## Options

```
npm create verikit@latest [project-name] [--no-install]
```

| Option         | Does                                        |
| -------------- | ------------------------------------------- |
| `project-name` | Directory and package name. Asked if omitted. |
| `--no-install` | Skips installing dependencies.              |

Requires Node.js 24 or newer.
