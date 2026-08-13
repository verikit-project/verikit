import {
  checkAction,
  checkFieldAccess,
  checkResourceOperation,
  validateResourceAsync,
  validateWritableFields,
  type FieldSchema,
  type PermissionContext,
  type PermissionsBuilder,
  type ResourceOperation,
  type ValidationResult,
} from "@verikit/core";

export interface PermissionCheckOutcome {
  allowed: boolean;
  message?: string;
}

/**
 * Runs `checkResourceOperation` unless the resource is explicitly marked `"open"`. Mirrors `runAction`'s own convention of only invoking `checkAction` when a `PermissionsBuilder` is actually attached.
 */
export async function maybeCheckResourceOperation<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord> | "open",
  operation: ResourceOperation,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckOutcome> {
  if (permissions === "open") {
    return { allowed: true };
  }

  const result = await checkResourceOperation(permissions, operation, context);
  return { allowed: result.allowed, message: result.reason };
}

/**
 * Runs `checkAction` unless the resource is explicitly marked `"open"`. Mirrors `maybeCheckResourceOperation` so a named action gets the same resource-level gate as CRUD operations, independent of any permissions the action itself may declare via `.permissions()`.
 */
export async function maybeCheckAction<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord> | "open",
  action: string,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckOutcome> {
  if (permissions === "open") {
    return { allowed: true };
  }

  const result = await checkAction(permissions, action, context);
  return { allowed: result.allowed, message: result.reason };
}

/**
 * Computes the set of field names the actor cannot read, once per request rather than once per record list/search apply the same set to every row; find has a real record and can pass it through `context` for record-aware rules.
 */
export async function unreadableFieldNames<TActor, TRecord>(
  fields: Record<string, FieldSchema>,
  permissions: PermissionsBuilder<TActor, TRecord> | "open",
  context: PermissionContext<TActor, TRecord>,
): Promise<Set<string>> {
  if (permissions === "open") {
    return new Set();
  }

  const runtime = permissions.getRuntime();
  const checks = await Promise.all(
    Object.keys(fields).map(async (name) => {
      const access = await checkFieldAccess(runtime, name, "read", context);
      return [name, access.allowed] as const;
    }),
  );

  return new Set(
    checks.filter(([, allowed]) => !allowed).map(([name]) => name),
  );
}

/** Returns a copy of `record` with keys in `hidden` removed. */
export function redactFields(
  record: Record<string, unknown>,
  hidden: ReadonlySet<string>,
): Record<string, unknown> {
  if (hidden.size === 0) {
    return record;
  }

  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !hidden.has(key)),
  );
}

/**
 * Produces the only record shape the HTTP API may expose: the adapter's canonical
 * string `id` plus declared resource fields that the actor is allowed to read.
 *
 * Adapters are required to return this shape themselves, but this server-side
 * allow-list is a defence-in-depth boundary. It prevents an adapter accidentally
 * leaking ORM-only columns (for example `passwordHash`) if it returns a whole
 * storage row instead of a projection.
 */
export function presentRecord(
  record: Record<string, unknown>,
  fields: Record<string, FieldSchema>,
  hidden: ReadonlySet<string>,
): Record<string, unknown> {
  const allowed = new Set(["id", ...Object.keys(fields)]);

  return Object.fromEntries(
    Object.entries(record).filter(
      ([name]) => allowed.has(name) && !hidden.has(name),
    ),
  );
}

/**

* Validates a create/update body. Field-level write permissions are enforced
* via `validateWritableFields` unless the resource is explicitly `"open"`,
* in which case validation falls back to `validateResourceAsync`.
*
* Fields marked `.readOnly()` are never client-writable, regardless of write
* permissions or whether the resource is `"open"` (see `FieldSchema.readOnly`).
* Although `@verikit/react` forms already omit read-only values, this is
* enforced here as defence in depth for other clients or stale cached forms.
*
* Server-owned read-only fields supplied through `trustedValues` are still
* validated and included. Only their client-provided values are excluded.
  */
export async function validateResourceInput<TActor, TRecord>(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
  permissions: PermissionsBuilder<TActor, TRecord> | "open",
  context: PermissionContext<TActor, TRecord>,
  trustedValues: Record<string, unknown> = {},
): Promise<ValidationResult<Record<string, unknown>>> {
  const clientWritableFields = Object.fromEntries(
    Object.entries(fields).filter(
      ([name, schema]) =>
        !schema.readOnly || Object.hasOwn(trustedValues, name),
    ),
  );

  if (permissions === "open" || Object.keys(trustedValues).length === 0) {
    return permissions === "open"
      ? validateResourceAsync(clientWritableFields, values)
      : validateWritableFields(
          clientWritableFields,
          values,
          permissions,
          context,
        );
  }

  // Server-owned fields (e.g. `organizationId`) must still be validated without
  // requiring client write permission. Partition the fields once, validate client
  // fields through the permission-gated path and trusted fields through plain
  // schema validation, then merge the results.
  //
  // Both helpers receive the full merged `values`, but only read values for the
  // fields provided to them, so each field is validated exactly once.
  const clientFields: Record<string, FieldSchema> = {};
  const trustedFields: Record<string, FieldSchema> = {};

  for (const [name, schema] of Object.entries(clientWritableFields)) {
    (Object.hasOwn(trustedValues, name) ? trustedFields : clientFields)[name] =
      schema;
  }

  // Sequential, not `Promise.all`: trusted fields can carry their own async
  // validators (e.g. a uniqueness check with a real side effect), which
  // shouldn't run at all once client validation has already failed  a
  // request that's going to 400 regardless shouldn't also pay for (or
  // trigger the side effects of) validating fields the client never even
  // controlled.
  const clientResult = await validateWritableFields(
    clientFields,
    values,
    permissions,
    context,
  );

  if (!clientResult.success) {
    return clientResult;
  }

  const trustedResult = await validateResourceAsync(trustedFields, values);

  if (!trustedResult.success) {
    return trustedResult;
  }

  return {
    success: true,
    value: { ...clientResult.value, ...trustedResult.value },
  };
}
