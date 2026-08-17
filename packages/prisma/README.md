# @verikit/prisma

Prisma ORM adapter for VeriKit server resources.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.

## Consistent pagination

Use `listTransaction` when list results and pagination totals must share a
consistent database snapshot:

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