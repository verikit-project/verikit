# {{projectName}}

A [Verikit](https://verikit.dev) app: React, Hono, Drizzle, and SQLite.

```sh
npm run dev      # http://localhost:3000
```

The database (`data/app.db`) is created, migrated, and seeded on first run.

## Add a resource

```sh
npx verikit make:resource Tag name:text color:select:red,green,blue
npm run db:generate
```

That creates `resources/tag.ts`, regenerates the database schema, and adds a
migration. The dev server restarts and the Tags page appears in the panel.

Field types: `text`, `textarea`, `email`, `number`, `integer`, `boolean`,
`date`, `datetime`, `select:<a>,<b>`, and `belongsTo:<resource>`. Fields are
required; end one with `?` to make it nullable, e.g. `body:textarea?`.

To change a resource later, edit its file in `resources/` and run
`npm run db:generate` again.

## Add an action

```sh
npx verikit make:action post publish
```

Declares the action in `resources/post.actions.ts`, where the admin panel picks
it up as a button on each row, and creates its server-side handler in
`actions/post/publish.ts`, served at `POST /api/post/actions/publish`. Set the
label, confirmation, or form on the declaration; the handler is built from it,
so the server and browser always agree.

## Where things live

| Path                    | What it is                                                         | Edit it? |
| ----------------------- | ------------------------------------------------------------------ | -------- |
| `resources/*.ts`        | Resource definitions: fields, validation, relationships            | Yes      |
| `resources/*.actions.ts` | Action declarations: labels, confirmations, forms                 | Yes      |
| `actions/*/*.ts`        | Server-side action handlers                                        | Yes      |
| `server/permissions.ts` | Who may do what with each resource                                 | Yes      |
| `resources/index.ts`    | List of every resource                                             | Generated |
| `actions/index.ts`      | List of every action handler                                       | Generated |
| `db/schema.ts`          | Drizzle tables, one per resource                                   | Generated |
| `db/custom-schema.ts`   | Extra tables of your own (optional; re-exported by `db/schema.ts`) | Yes      |
| `db/migrations/`        | SQL migrations, applied on startup                                 | Generated |
| `server/app.ts`         | Hono app serving every resource at `/api/<resource>`               | Rarely   |
| `src/App.tsx`           | The admin panel (`verikit/react-panel`)                           | Yes      |

## Scripts

| Script                | Does                                                         |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | API and UI on one port, restarts on server changes           |
| `npm run build`       | Builds the UI into `dist/`                                   |
| `npm start`           | Serves the API and the built UI                              |
| `npm run typecheck`   | Checks generated files are current, then type-checks the app |
| `npm run db:generate` | Regenerates `db/schema.ts`, then creates a migration         |
| `npm run db:studio`   | Opens Drizzle Studio                                         |

Set `PORT` and `DATABASE_PATH` to override the defaults.
