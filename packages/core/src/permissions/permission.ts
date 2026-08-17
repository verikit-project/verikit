/**
 * CRUD operations that resource-level rules can gate.
 *
 * `"list"` gates collection queries without record context.
 * `"read"` gates single-record fetches with `context.record`; read rules are
 * never evaluated against list/search results.
 */
export type ResourceOperation =
  "create" | "list" | "read" | "update" | "delete";

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

const staticPermissionResult = Symbol("staticPermissionResult");

type StaticPermissionRule<TActor, TRecord> = PermissionRule<TActor, TRecord> & {
  [staticPermissionResult]?: boolean;
};

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
  if (typeof input === "function") {
    return input;
  }

  const rule = (() => input) as StaticPermissionRule<TActor, TRecord>;
  rule[staticPermissionResult] = input;
  return rule;
}

/**
 * Returns the rule's boolean value, or `undefined` if evaluation requires
 * permission context. Consumers without record context must treat `undefined`
 * as denied.
 */
export function staticPermissionValue<TActor = unknown, TRecord = unknown>(
  rule: PermissionRule<TActor, TRecord> | undefined,
): boolean | undefined {
  return (rule as StaticPermissionRule<TActor, TRecord> | undefined)?.[
    staticPermissionResult
  ];
}
