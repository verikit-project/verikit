import {
  FieldAccess,
  normalizePermissionRule,
  PermissionRule,
  PermissionRuleInput,
  ResourceOperation,
} from "./permission.js";

/** Immutable state backing a `PermissionsBuilder`. */
export interface PermissionsState<TActor = unknown, TRecord = unknown> {
  resource: Partial<Record<ResourceOperation, PermissionRule<TActor, TRecord>>>;
  fields: Record<
    string,
    Partial<Record<FieldAccess, PermissionRule<TActor, TRecord>>>
  >;
  actions: Record<string, PermissionRule<TActor, TRecord>>;
}

function emptyState<TActor, TRecord>(): PermissionsState<TActor, TRecord> {
  return { resource: {}, fields: {}, actions: {} };
}

function assertNonEmptyName(kind: string, name: string): void {
  if (name.trim().length === 0) {
    throw new Error(`${kind} names must be non-empty strings.`);
  }
}

/**
 * Immutable fluent builder describing CRUD-level operations,
 * per-field read/write access, and named runtime actions.
 *
 * This builder only assembles rules; it does not evaluate them. Evaluating a
 * rule against a `PermissionContext` (and wiring that into `validateResource`
 * or `runAction`) is left to a runtime helper.
 */
export class PermissionsBuilder<TActor = unknown, TRecord = unknown> {
  private readonly state: PermissionsState<TActor, TRecord>;

  constructor(state: PermissionsState<TActor, TRecord> = emptyState()) {
    this.state = state;
  }

  private withState(patch: Partial<PermissionsState<TActor, TRecord>>): this {
    const Builder = this.constructor as new (
      state: PermissionsState<TActor, TRecord>,
    ) => this;

    return new Builder({ ...this.state, ...patch });
  }

  /** Gates a resource-level CRUD operation. */
  can(
    operation: ResourceOperation,
    rule: PermissionRuleInput<TActor, TRecord>,
  ): this {
    return this.withState({
      resource: {
        ...this.state.resource,
        [operation]: normalizePermissionRule(rule),
      },
    });
  }

  /** Gates read and/or write access to a named field. */
  field(
    name: string,
    access: {
      read?: PermissionRuleInput<TActor, TRecord>;
      write?: PermissionRuleInput<TActor, TRecord>;
    },
  ): this {
    assertNonEmptyName("Field", name);

    const existing = this.state.fields[name] ?? {};

    return this.withState({
      fields: {
        ...this.state.fields,
        [name]: {
          ...existing,
          ...(access.read !== undefined && {
            read: normalizePermissionRule(access.read),
          }),
          ...(access.write !== undefined && {
            write: normalizePermissionRule(access.write),
          }),
        },
      },
    });
  }

  /** Gates whether a named runtime action may run. */
  action(name: string, rule: PermissionRuleInput<TActor, TRecord>): this {
    assertNonEmptyName("Action", name);

    return this.withState({
      actions: { ...this.state.actions, [name]: normalizePermissionRule(rule) },
    });
  }

  /** @internal Used by a future runtime evaluator. */
  getRuntime(): PermissionsState<TActor, TRecord> {
    return this.state;
  }
}

/** Creates an empty permissions builder for a resource. */
export function definePermissions<
  TActor = unknown,
  TRecord = unknown,
>(): PermissionsBuilder<TActor, TRecord> {
  return new PermissionsBuilder();
}
