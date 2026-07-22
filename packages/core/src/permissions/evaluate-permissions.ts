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
 * Rules are opt-in: an operation, field, or action with no rule attached is
 * allowed by default. This keeps `PermissionsBuilder` additive — a resource
 * that declares no permissions behaves exactly as it did before this module
 * existed, and a resource that declares only some rules leaves everything
 * else open.
 */
const ALLOWED_BY_DEFAULT: PermissionCheckResult = { allowed: true };

/**
 * Checks whether the actor in `context` may perform a resource-level CRUD
 * operation. Resolves to `{ allowed: true }` if no rule was attached via
 * `.can()` for that operation.
 */
export async function checkResourceOperation<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord>,
  operation: ResourceOperation,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckResult> {
  const rule = permissions.getRuntime().resource[operation];
  if (!rule) {
    return ALLOWED_BY_DEFAULT;
  }

  return normalizePermissionResult(await rule(context));
}

/**
 * Checks whether the actor in `context` has read or write access to a named
 * field. Resolves to `{ allowed: true }` if no rule was attached via
 * `.field()` for that field/access combination.
 *
 * Read and write are independent: a `.field(name, { read })` call leaves
 * write access unrestricted (and vice versa) unless both are set.
 */
export async function checkFieldAccess<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord>,
  field: string,
  access: FieldAccess,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckResult> {
  const rule = permissions.getRuntime().fields[field]?.[access];
  if (!rule) {
    return ALLOWED_BY_DEFAULT;
  }

  return normalizePermissionResult(await rule(context));
}

/**
 * Checks whether the actor in `context` may run a named runtime action.
 * Resolves to `{ allowed: true }` if no rule was attached via `.action()`
 * for that action name.
 */
export async function checkAction<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord>,
  action: string,
  context: PermissionContext<TActor, TRecord>,
): Promise<PermissionCheckResult> {
  const rule = permissions.getRuntime().actions[action];
  if (!rule) {
    return ALLOWED_BY_DEFAULT;
  }

  return normalizePermissionResult(await rule(context));
}
