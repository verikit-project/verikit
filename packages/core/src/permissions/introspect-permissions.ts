import {
  FieldAccess,
  PermissionRule,
  ResourceOperation,
  staticPermissionValue,
} from "./permission.js";
import { PermissionsBuilder } from "./permissions-builder.js";

/**
 * Structural summary of a permission rule without evaluating or exposing
 * its implementation: `"allow"` or `"deny"` for static rules (e.g. `.can("create", true)`),
 * `"dynamic"` for runtime-dependent functions.
 */
export type PermissionPresence = "allow" | "deny" | "dynamic";

/**
 * Serializable summary of `PermissionsBuilder` rules.
 * Omits unattached rules (not reported as "deny") to avoid conflating
 * runtime's fail-closed default with explicit `.can(op, false)`.
 */
export interface PermissionsIntrospection {
  resource: Partial<Record<ResourceOperation, PermissionPresence>>;
  fields: Record<string, Partial<Record<FieldAccess, PermissionPresence>>>;
  actions: Record<string, PermissionPresence>;
}

function presenceOf(
  rule: PermissionRule<never, never> | undefined,
): PermissionPresence {
  const staticValue = staticPermissionValue(rule);
  return staticValue === undefined ? "dynamic" : staticValue ? "allow" : "deny";
}

/**
 * Derives a `PermissionsIntrospection` summary from a `PermissionsBuilder`,
 * using `staticPermissionValue()` to distinguish static allow/deny from
 * dynamic rules without evaluating them against any actor/record.
 */
export function introspectPermissions<TActor, TRecord>(
  permissions: PermissionsBuilder<TActor, TRecord>,
): PermissionsIntrospection {
  const state = permissions.getRuntime();

  const resource = Object.fromEntries(
    Object.entries(state.resource).map(([operation, rule]) => [
      operation,
      presenceOf(rule),
    ]),
  ) as PermissionsIntrospection["resource"];

  const fields = Object.fromEntries(
    Object.entries(state.fields).map(([name, access]) => [
      name,
      Object.fromEntries(
        Object.entries(access).map(([mode, rule]) => [mode, presenceOf(rule)]),
      ),
    ]),
  ) as PermissionsIntrospection["fields"];

  const actions = Object.fromEntries(
    Object.entries(state.actions).map(([name, rule]) => [
      name,
      presenceOf(rule),
    ]),
  ) as PermissionsIntrospection["actions"];

  return { resource, fields, actions };
}
