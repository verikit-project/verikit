# Contributing to Verikit

## Setup

Requires Node.js 24 and pnpm 11.21.0. Node is pinned by `.nvmrc`/`.node-version`; the root
`package.json` pins pnpm through `packageManager` and `devEngines`. CI installs the same version.
Run `corepack enable` once per machine, then a version manager that reads
`.nvmrc`/`.node-version` (nvm, fnm, mise, ...) will pick up the right Node version automatically.

```sh
corepack enable
nvm use           # or: fnm use / mise install
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm verify
```

## Notes

- Permissions are required on every resource passed to `createServer`  pass a `definePermissions()`
  builder, or the literal `"open"` to explicitly run a resource with no permission checks. Once a
  builder is attached, it's fail-closed at every level it gates (CRUD, field read/write, named
  actions): anything with no explicit rule is denied, with no partial opt-in.
- `@verikit/drizzle` currently supports SQLite and Postgres. MySQL tables are rejected at
  `createDrizzleAdapter()` call time (`mysql2` has no `RETURNING` support, which `create()`/`update()`
  depend on). A resource's table needs exactly one primary-key column, and any `.searchable()` field
  must map to a text column.
