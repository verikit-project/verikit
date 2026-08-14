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
 * Returns the API-safe record shape: its `id` and readable resource fields.
 * Acts as a final allow-list against leaking undeclared adapter data.
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
 * Validates create/update input, enforcing field permissions unless `"open"`.
 * Read-only fields reject client input but accept validated `trustedValues`.
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

  // Validate client fields with permissions and trusted fields against the schema.
  // Both use the merged values for context, while each field is validated once.
  const clientFields: Record<string, FieldSchema> = {};
  const trustedFields: Record<string, FieldSchema> = {};

  for (const [name, schema] of Object.entries(clientWritableFields)) {
    (Object.hasOwn(trustedValues, name) ? trustedFields : clientFields)[name] =
      schema;
  }

  // Validate sequentially to avoid running costly or side-effecting trusted-field
  // validators after client validation has already failed.
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
