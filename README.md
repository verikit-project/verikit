# Verikit

Validation, Entities, Resources & Interfaces Toolkit.

Verikit is a TypeScript toolkit for defining reusable resource schemas.

- Website and docs: [verikit.dev](https://verikit.dev)

## Packages

- `@verikit/core`
- `@verikit/runtime`
- `@verikit/react`
- `@verikit/theme`
- `@verikit/server`
- `@verikit/drizzle`
- `@verikit/client`

## Install

```sh
pnpm add @verikit/core @verikit/runtime
pnpm add @verikit/react @verikit/theme
```

## Development

Requires Node.js 24 and pnpm 11 — pinned by `.nvmrc`/`.node-version` (Node) and the root
`package.json`'s `packageManager` field (pnpm, via Corepack). Run `corepack enable` once per
machine, then a version manager that reads `.nvmrc`/`.node-version` (nvm, fnm, mise, ...) will
pick up the right Node version automatically.

```sh
corepack enable
nvm use           # or: fnm use / mise install
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm verify
```

## Status

Verikit is under active development. APIs may change before a stable release.
