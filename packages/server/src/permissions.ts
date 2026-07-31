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
 * Runs `checkResourceOperation` only when `permissions` is configured for the
 * resource; unguarded (always allowed) otherwise. Mirrors `runAction`'s own
 * convention of only invoking `checkAction` when a `PermissionsBuilder` is
 * actually attached.
 */
export async function maybeCheckResourceOperation<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord> | undefined,
  operation: ResourceOperation,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckOutcome> {
  if (!permissions) {
    return { allowed: true };
  }

  const result = await checkResourceOperation(permissions, operation, context);
  return { allowed: result.allowed, message: result.reason };
}

/**
 * Runs `checkAction` only when `permissions` is configured for the resource;
 * unguarded (always allowed) otherwise. Mirrors `maybeCheckResourceOperation`
 * so a named action gets the same resource-level gate as CRUD operations,
 * independent of any permissions the action itself may declare via
 * `.permissions()`.
 */
export async function maybeCheckAction<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord> | undefined,
  action: string,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckOutcome> {
  if (!permissions) {
    return { allowed: true };
  }

  const result = await checkAction(permissions, action, context);
  return { allowed: result.allowed, message: result.reason };
}

/**
 * Computes the set of field names the actor cannot read, once per request
 * rather than once per record — list/search apply the same set to every row;
 * find has a real record and can pass it through `context` for record-aware
 * rules.
 */
export async function unreadableFieldNames<TActor, TRecord>(
  fields: Record<string, FieldSchema>,
  permissions: PermissionsBuilder<TActor, TRecord> | undefined,
  context: PermissionContext<TActor, TRecord>,
): Promise<Set<string>> {
  if (!permissions) {
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
 * Validates a create/update body: gated per-field via `validateWritableFields`
 * when `permissions` is configured for the resource, plain
 * `validateResourceAsync` otherwise.
 */
export function validateResourceInput<TActor, TRecord>(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
  permissions: PermissionsBuilder<TActor, TRecord> | undefined,
  context: PermissionContext<TActor, TRecord>,
): Promise<ValidationResult<Record<string, unknown>>> {
  return permissions
    ? validateWritableFields(fields, values, permissions, context)
    : validateResourceAsync(fields, values);
}
