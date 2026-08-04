import {
  FieldAccess,
  normalizePermissionRule,
  PermissionRule,
  PermissionRuleInput,
  ResourceOperation,
} from "./permission.js";
import type { Resource } from "../resource/resource.js";

export type ResourcePermissionFieldNames<TResource> =
  TResource extends Resource<
    string,
    infer TFields,
    unknown,
    infer _TRelationships
  >
    ? keyof TFields & string
    : never;

/** Immutable state backing a `PermissionsBuilder`. */
export interface PermissionsState<
  TActor = unknown,
  TRecord = unknown,
  TFieldName extends string = string,
  TActionName extends string = string,
> {
  resource: Partial<Record<ResourceOperation, PermissionRule<TActor, TRecord>>>;
  fields: Record<
    TFieldName,
    Partial<Record<FieldAccess, PermissionRule<TActor, TRecord>>>
  >;
  actions: Record<TActionName, PermissionRule<TActor, TRecord>>;
}

export interface PermissionNameConstraints<
  TFieldName extends string,
  TActionName extends string,
> {
  fields?: readonly TFieldName[];
  actions?: readonly TActionName[];
}

function emptyState<
  TActor,
  TRecord,
  TFieldName extends string,
  TActionName extends string,
>(): PermissionsState<TActor, TRecord, TFieldName, TActionName> {
  return {
    resource: {},
    fields: {} as Record<
      TFieldName,
      Partial<Record<FieldAccess, PermissionRule<TActor, TRecord>>>
    >,
    actions: {} as Record<TActionName, PermissionRule<TActor, TRecord>>,
  };
}

function assertNonEmptyName(kind: string, name: string): void {
  if (name.trim().length === 0) {
    throw new Error(`${kind} names must be non-empty strings.`);
  }
}

function assertKnownName(
  kind: string,
  name: string,
  knownNames: readonly string[] | undefined,
): void {
  if (knownNames && !knownNames.includes(name)) {
    throw new Error(`Unknown ${kind.toLowerCase()} "${name}".`);
  }
}

function cloneState<
  TActor,
  TRecord,
  TFieldName extends string,
  TActionName extends string,
>(
  state: PermissionsState<TActor, TRecord, TFieldName, TActionName>,
): PermissionsState<TActor, TRecord, TFieldName, TActionName> {
  return {
    resource: { ...state.resource },
    fields: Object.fromEntries(
      Object.entries(state.fields).map(([name, access]) => [
        name,
        {
          ...(access as Partial<
            Record<FieldAccess, PermissionRule<TActor, TRecord>>
          >),
        },
      ]),
    ) as PermissionsState<TActor, TRecord, TFieldName, TActionName>["fields"],
    actions: { ...state.actions },
  };
}

/**
 * Immutable fluent builder describing CRUD-level operations,
 *  per-field read/write access, and named runtime actions. This builder only assembles rules;
 * it does not evaluate them. Evaluating a rule against a `PermissionContext` (and wiring that into `validateResource` or `runAction`) is left to a runtime helper.
 */
export class PermissionsBuilder<
  TActor = unknown,
  TRecord = unknown,
  TFieldName extends string = string,
  TActionName extends string = string,
> {
  private readonly state: PermissionsState<
    TActor,
    TRecord,
    TFieldName,
    TActionName
  >;
  private readonly constraints: PermissionNameConstraints<
    TFieldName,
    TActionName
  >;

  constructor(
    state: PermissionsState<
      TActor,
      TRecord,
      TFieldName,
      TActionName
    > = emptyState(),
    constraints: PermissionNameConstraints<TFieldName, TActionName> = {},
  ) {
    this.state = cloneState(state);
    this.constraints = {
      fields: constraints.fields ? [...constraints.fields] : undefined,
      actions: constraints.actions ? [...constraints.actions] : undefined,
    };
  }

  private withState(
    patch: Partial<PermissionsState<TActor, TRecord, TFieldName, TActionName>>,
  ): this {
    const Builder = this.constructor as new (
      state: PermissionsState<TActor, TRecord, TFieldName, TActionName>,
      constraints: PermissionNameConstraints<TFieldName, TActionName>,
    ) => this;

    return new Builder({ ...this.state, ...patch }, this.constraints);
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
    name: TFieldName,
    access: {
      read?: PermissionRuleInput<TActor, TRecord>;
      write?: PermissionRuleInput<TActor, TRecord>;
    },
  ): this {
    assertNonEmptyName("Field", name);
    assertKnownName("Field", name, this.constraints.fields);

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
  action(name: TActionName, rule: PermissionRuleInput<TActor, TRecord>): this {
    assertNonEmptyName("Action", name);
    assertKnownName("Action", name, this.constraints.actions);

    return this.withState({
      actions: { ...this.state.actions, [name]: normalizePermissionRule(rule) },
    });
  }

  /** @internal Used by a future runtime evaluator. */
  getRuntime(): PermissionsState<TActor, TRecord, TFieldName, TActionName> {
    return cloneState(this.state);
  }
}

/** Creates an empty permissions builder for a resource. */
export function definePermissions<
  TActor = unknown,
  TRecord = unknown,
  TFieldName extends string = string,
  TActionName extends string = string,
>(
  constraints: PermissionNameConstraints<TFieldName, TActionName> = {},
): PermissionsBuilder<TActor, TRecord, TFieldName, TActionName> {
  return new PermissionsBuilder(undefined, constraints);
}

/**
 * Creates a permissions builder constrained to a resource's field names, with optional action names supplied by the caller.
 */
export function defineResourcePermissions<
  TActor,
  TRecord,
  TResource extends Resource,
  const TActionName extends string = string,
>(
  resource: TResource,
  options: { actions?: readonly TActionName[] } = {},
): PermissionsBuilder<
  TActor,
  TRecord,
  ResourcePermissionFieldNames<TResource>,
  TActionName
> {
  return new PermissionsBuilder(undefined, {
    fields: Object.keys(
      resource.fields,
    ) as ResourcePermissionFieldNames<TResource>[],
    actions: options.actions,
  });
}
