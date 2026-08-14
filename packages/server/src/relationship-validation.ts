import type {
  BelongsToRelationshipSchema,
  ValidationIssue,
} from "@verikit/core";
import { resolveScope } from "./access.js";
import { maybeCheckResourceOperation } from "./permissions.js";
import type { RouteTableEntry } from "./routing/route-table.js";

/**
 * Erases the actor type here since it is only forwarded
 * to permission checks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
type AnyRouteTableEntry = RouteTableEntry<any>;

/**
 * Returns writable `belongsTo` relationships with field-based foreign keys.
 * Adapter-specific foreign key references are excluded.
 */
function resolvableBelongsToRelationships(
  entry: AnyRouteTableEntry,
): BelongsToRelationshipSchema[] {
  return Object.entries(entry.config.resource.relationships).flatMap(
    ([name, builder]) => {
      const schema = builder.toSchema(name);

      return schema.relationshipType === "belongsTo" &&
        typeof schema.foreignKey === "string"
        ? [schema]
        : [];
    },
  );
}

function relationshipLabel(
  entry: AnyRouteTableEntry,
  relationship: BelongsToRelationshipSchema,
  foreignKeyName: string,
): string {
  return (
    relationship.label ?? entry.fields[foreignKeyName]?.label ?? foreignKeyName
  );
}

function invalidReferenceIssue(
  entry: AnyRouteTableEntry,
  relationship: BelongsToRelationshipSchema,
  foreignKeyName: string,
): ValidationIssue {
  return {
    path: [foreignKeyName],
    message: `${relationshipLabel(entry, relationship, foreignKeyName)} does not exist or is not accessible.`,
  };
}

/**
 * Validates submitted `belongsTo` references against the target's
 * existence, scope, and read permission. Unregistered targets fail closed.
 */
async function checkReference(
  entry: AnyRouteTableEntry,
  routeTable: readonly AnyRouteTableEntry[],
  relationship: BelongsToRelationshipSchema,
  foreignKeyName: string,
  value: unknown,
  actor: unknown,
): Promise<ValidationIssue | undefined> {
  const target = routeTable.find(
    (candidate) => candidate.config.resource.name === relationship.resource,
  );

  if (!target) {
    return invalidReferenceIssue(entry, relationship, foreignKeyName);
  }

  const scope = await resolveScope(target, actor);
  const record = (await target.config.adapter.find(String(value), scope)) as
    Record<string, unknown> | undefined;

  if (!record) {
    return invalidReferenceIssue(entry, relationship, foreignKeyName);
  }

  const permission = await maybeCheckResourceOperation(
    target.config.permissions,
    "read",
    { actor, record },
  );

  // Same existence-oracle guard `handleFind`/`handleUpdate` apply to a
  // fetched-but-unreadable record: report it identically to a missing one.
  return permission.allowed
    ? undefined
    : invalidReferenceIssue(entry, relationship, foreignKeyName);
}

/**
 * Validates submitted `belongsTo` foreign keys against their targets.
 * Only fields in `clientFieldNames` are checked; server-owned and nullish
 * values are excluded.
 */
export async function validateRelationshipReferences(
  entry: AnyRouteTableEntry,
  routeTable: readonly AnyRouteTableEntry[],
  values: Record<string, unknown>,
  clientFieldNames: ReadonlySet<string>,
  actor: unknown,
): Promise<ValidationIssue[]> {
  const relationships = resolvableBelongsToRelationships(entry).filter(
    (relationship) => clientFieldNames.has(relationship.foreignKey as string),
  );

  const results = await Promise.all(
    relationships.map((relationship) => {
      const foreignKeyName = relationship.foreignKey as string;
      const value = values[foreignKeyName];

      return value === null || value === undefined
        ? undefined
        : checkReference(
            entry,
            routeTable,
            relationship,
            foreignKeyName,
            value,
            actor,
          );
    }),
  );

  return results.filter(
    (issue): issue is ValidationIssue => issue !== undefined,
  );
}
