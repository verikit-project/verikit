/** Baseline CRUD-style operations a resource-level rule can gate. */
export type ResourceOperation = "create" | "read" | "update" | "delete";

/** Access modes a field-level rule can gate. */
export type FieldAccess = "read" | "write";

/**
 * Context passed to a permission rule: who is acting, and optionally on what record.
 */
export interface PermissionContext<TActor = unknown, TRecord = unknown> {
  actor: TActor;
  record?: TRecord;
}

/**
 * Outcome of a permission check; the boolean shorthand widens to the object form.
 */
export type PermissionResult =
  | boolean
  | {
      allowed: boolean;
      reason?: string;
    };

/** A predicate that decides whether an actor may perform an operation. */
export type PermissionRule<TActor = unknown, TRecord = unknown> = (
  context: PermissionContext<TActor, TRecord>,
) => PermissionResult | Promise<PermissionResult>;

/** A rule, or a static boolean shorthand for an always-allow/deny rule. */
export type PermissionRuleInput<TActor = unknown, TRecord = unknown> =
  PermissionRule<TActor, TRecord> | boolean;

/** Normalizes a `PermissionResult` to its object form. */
export function normalizePermissionResult(result: PermissionResult): {
  allowed: boolean;
  reason?: string;
} {
  return typeof result === "boolean" ? { allowed: result } : result;
}

/**
 * Normalizes a rule input (boolean shorthand or predicate) to a callable rule.
 */
export function normalizePermissionRule<TActor = unknown, TRecord = unknown>(
  input: PermissionRuleInput<TActor, TRecord>,
): PermissionRule<TActor, TRecord> {
  return typeof input === "function" ? input : () => input;
}
