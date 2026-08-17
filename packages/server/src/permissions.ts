import {
  checkAction,
  checkFieldAccess,
  checkResourceOperation,
  staticPermissionValue,
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
 * Returns field names the context cannot read.
 * Permission evaluation failures fail closed and are treated as denied.
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
      try {
        const access = await checkFieldAccess(runtime, name, "read", context);
        return [name, access.allowed] as const;
      } catch {
        return [name, false] as const;
      }
    }),
  );

  return new Set(
    checks.filter(([, allowed]) => !allowed).map(([name]) => name),
  );
}

/**
 * Returns fields that cannot be used in list/search queries.
 * Since query planning has no record context, filter, sort, and search require
 * an explicit static `read: true` rule.
 */
export function unreadableQueryFieldNames<TActor, TRecord>(
  fields: Record<string, FieldSchema>,
  permissions: PermissionsBuilder<TActor, TRecord> | "open",
): Set<string> {
  if (permissions === "open") {
    return new Set();
  }

  const runtime = permissions.getRuntime();
  return new Set(
    Object.keys(fields).filter(
      (name) => staticPermissionValue(runtime.fields[name]?.read) !== true,
    ),
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
 * Returns the API-safe record shape: `id` plus readable resource fields.
 * Prevents undeclared adapter data from leaking into responses.
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

  // Validate permitted client and trusted fields against the schema.
  // Both use merged values as context, with each field validated once.
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
