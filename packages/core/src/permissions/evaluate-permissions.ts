import {
  FieldAccess,
  normalizePermissionResult,
  PermissionContext,
  ResourceOperation,
} from "./permission.js";
import { PermissionsBuilder } from "./permissions-builder.js";

/** Result of evaluating a single permission rule (or its default when unset). */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Permissions fail closed: an operation, field, or action with no matching
 * rule is denied until the caller explicitly attaches an allow rule.
 */
function deniedByDefault(): PermissionCheckResult {
  return { allowed: false };
}

/**
 * Checks whether the actor in `context` may perform a resource-level CRUD
 * operation. Resolves to `{ allowed: false }` if no rule was attached via
 * `.can()` for that operation.
 */
export async function checkResourceOperation<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord>,
  operation: ResourceOperation,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckResult> {
  const rule = permissions.getRuntime().resource[operation];
  if (!rule) {
    return deniedByDefault();
  }

  return normalizePermissionResult(await rule(context));
}

/**
 * Checks whether the actor in `context` has read or write access to a named
 * field. Resolves to `{ allowed: false }` if no rule was attached via
 * `.field()` for that field/access combination.
 *
 * Read and write are independent: a `.field(name, { read })` call leaves
 * write access denied until its own rule is set (and vice versa).
 */
export async function checkFieldAccess<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord>,
  field: string,
  access: FieldAccess,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckResult> {
  const rule = permissions.getRuntime().fields[field]?.[access];
  if (!rule) {
    return deniedByDefault();
  }

  return normalizePermissionResult(await rule(context));
}

/**
 * Checks whether the actor in `context` may run a named runtime action.
 * Resolves to `{ allowed: false }` if no rule was attached via `.action()`
 * for that action name.
 */
export async function checkAction<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord>,
  action: string,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckResult> {
  const rule = permissions.getRuntime().actions[action];
  if (!rule) {
    return deniedByDefault();
  }

  return normalizePermissionResult(await rule(context));
}
