# {{projectName}}

A [Verikit](https://verikit.dev) app: React, Hono, Drizzle, and SQLite.

```sh
npm run dev      # http://localhost:3000
```

The database (`data/app.db`) is created, migrated, and seeded on first run.

## Where things live

| Path                 | What it is                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| `resources/`         | Resource definitions: fields, validation, permissions. Shared by both sides. |
| `db/schema.ts`       | Drizzle tables backing the resources.                                  |
| `db/migrations/`     | Generated SQL migrations, applied on startup.                          |
| `server/app.ts`      | Hono app exposing resources at `/api/<resource>`.                      |
| `src/App.tsx`        | The admin panel (`@verikit/react-panel`): list, create, and edit pages for each resource. |

## Add a resource

1. Add a table to `db/schema.ts` (include `revision: integer("revision").notNull().default(0)`).
2. Run `npm run db:generate` to create its migration.
3. Define the resource in `resources/`, with `table:` pointing at the new table.
4. Register it in `server/app.ts` and add it to `panelResources` in `resources/index.ts`. It appears in the navigation at `/<plural-name>`.

## Scripts

| Script                | Does                                          |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | API and UI on one port, restarts on server changes |
| `npm run build`       | Builds the UI into `dist/`                    |
| `npm start`           | Serves the API and the built UI               |
| `npm run typecheck`   | Type-checks the whole app                     |
| `npm run db:generate` | Creates a migration from `db/schema.ts`       |
| `npm run db:studio`   | Opens Drizzle Studio                          |

Set `PORT` and `DATABASE_PATH` to override the defaults.
