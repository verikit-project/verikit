# @verikit/server

Web-standard CRUD and action server for VeriKit resources.

See the [VeriKit documentation](https://verikit.dev) for setup and usage.

## Actions: declared on the resource, handled on the server

Declare actions next to the resource, without `.execute()`. The declaration is
client-safe, so `ResourceTable` and `ResourceForm` read its label,
confirmation, and form straight from the resource schema:

```ts
// resources/posts.ts: shared by client and server
export const publish = action("publish")
  .label("Publish")
  .confirmation("Publish this post?")
  .form({ note: text() })
  .returns<{ publishedAt: string }>(); // type-only; the handler must match

export const posts = defineResource("posts", { fields, actions: [publish] });
```

Attach the handler on the server only, built from the declaration:

```ts
// server.ts
createServer({
  resources: [
    {
      resource: posts,
      adapter,
      permissions,
      handlers: [publish.execute(async ({ record, input }) => /* ... */)],
    },
  ],
});
```

Only actions with a handler get a `POST {base}/actions/:name` route.
`createServer()` throws at startup if a handler names an action the resource
doesn't declare, lacks `.execute()`, or changes the declared label, form, or
confirmation. Server-only `.availableWhen()`, `.hooks()`, and `.permissions()`
can still be chained onto the handler.

The same declarations type the client, so action names, inputs, and results
need no hand-written definitions:

```ts
import type { InferClientResource } from "@verikit/runtime";

const client = createClient<{
  posts: InferClientResource<typeof posts> & { record: { id: string } };
}>({ baseUrl: "/api" });

const { result } = await client.resource("posts").action("publish", {
  note: "Ship it",
}); // result: { publishedAt: string }
```

To show only the actions a caller can run, list with `include=actions`
(`list({ includeActions: true })` on the client). The response's
`meta.actions` names each action the caller can't run, per record and for the
collection: `{ reason: "forbidden" }` when permissions deny it, or
`{ reason: "unavailable", message? }` when `.availableWhen()` says no. These
are the same checks the action route runs first, evaluated for every record on
the page, so they cost one permission check and guard call per action per row.
Guards run without `input` here. A guard that throws counts as forbidden and is
passed to `onError`. `ResourceTable` asks for this automatically: it hides
forbidden actions and disables unavailable ones, with the reason as a tooltip.

Fetching one record accepts `include=actions` too (`findWithActions(id)` on the
client), reporting only that record's record-scoped actions in `meta.actions`.
`ResourceDetail`, the built-in record page, uses it the same way.

**Migrating:** the per-resource `actions` option of `createServer()` is
deprecated. It still works, but logs a one-time warning per resource, and will
be removed in the next minor release. Move each action's declaration into
`defineResource({ actions })` and pass `action.execute(fn)` via `handlers`.

## Upload security

`file()` and `image()` accept rules verify recognized file signatures before
storage. In particular, `image()` rejects content that cannot be identified as
an image, even if its multipart MIME type or filename claims otherwise.

Use `createServer({ uploadProcessor })` to scan for malware, validate formats
that do not have a recognized signature, or re-encode untrusted images before
`storage.put()`. The processor can reject an upload by throwing a
`VerikitError` or return a sanitized `File`; its output is signature-validated
before storage.

Storage implementations should generate server-side object keys, never use
client filenames as paths, and serve uploads from a non-executable origin.
Apply appropriate access control, retention, and malware-scanning policies.

For resources with a `PermissionsBuilder`, uploads are fail-closed and require
both `.can("upload", ...)` and field-level write access. Upload permission is
separate from create/update because an upload persists to storage before any
record mutation occurs.


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

When a revision column isn't possible, a protected resource can opt out with
`unsafeUnconditionalWrites: true` in its `createServer()` resource config.
Update and delete then check permissions against the record as read and write
without a revision, so a change made in between is not detected. This is only
safe when the update and delete rules don't depend on record fields that can
change, such as a rule that checks only the actor's role. Adapters that support
conditional writes keep using them.

Custom adapter wrappers must forward `expectedRevision` (fourth argument to
`update`, third to `delete`). `findForMutation` must capture record and revision
atomically and return a detached record. Revisions must be safe nonnegative
integers with room to increment. This protects rules based on the target record;
rules depending on other records or external services need application-level
transactional coordination as well.
