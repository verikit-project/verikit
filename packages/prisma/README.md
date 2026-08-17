# @verikit/prisma

Prisma ORM adapter for VeriKit server resources.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.

## Consistent pagination

`listTransaction` is required: `list()`'s records and count queries always run
through it, in the same transaction, so a concurrent write between them can
never desync a page from `meta.total`. The adapter only ever sees a single
model delegate, not the full Prisma client, so it has no way to open a
transaction on its own  pass one built from your `PrismaClient`:

```ts
createPrismaAdapter(resource, {
  model: prisma.post,
  fields: { title: "title" },
  id: { field: "id" },
  listTransaction: (operation) =>
    prisma.$transaction(
      (tx) => operation(tx.post),
      { isolationLevel: "RepeatableRead" },
    ),
});