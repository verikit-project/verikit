# @verikit/drizzle

Drizzle ORM storage adapter for VeriKit server resources.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.


## Conditional writes for protected resources

Update and delete on resources with permissions require an adapter implementing
`findForMutation`. The server authorizes its detached record snapshot and passes
its storage-authored `revision` to `update`/`delete` as `expectedRevision`. The
adapter must compare that revision **in the same database statement as the write**,
combine it with the ID and scope, and throw `ConflictError` (HTTP 409) when no row
matches. Missing/deleted rows and stale revisions produce the same conflict. There
is no automatic retry; retrying must repeat authorization and validation.

The in-memory adapter supports this automatically. Database adapters require a
migration adding a dedicated non-null integer revision column with default `0`,
excluded from the resource field map:

```ts
// Drizzle: revision: integer("revision").notNull().default(0)
const adapter = createDrizzleAdapter(db, resource, {
  versionColumn: table.revision,
});

// Prisma model: revision Int @default(0)
const adapter = createPrismaAdapter(resource, {
  // ...existing model, fields, id, and listTransaction options
  versionField: "revision",
});
```

Configured adapters increment revisions on every update, including empty updates
and updates without an expected revision. Revisions never appear in API responses.
**All other writers must increment the same revision atomically**, including jobs,
custom actions, raw SQL, and other adapter instances. Do not reset revisions or
reuse a deleted record's ID. Provision the column before enabling the option; this
library does not run database migrations. Adapters without conditional-write
support return HTTP 501 for protected update/delete; explicitly `"open"` resources
retain unconditional writes.

Custom adapter wrappers must forward `expectedRevision` (fourth argument to
`update`, third to `delete`). `findForMutation` must capture record and revision
atomically and return a detached record. Revisions must be safe nonnegative
integers with room to increment. This protects rules based on the target record;
rules depending on other records or external services need application-level
transactional coordination as well.
