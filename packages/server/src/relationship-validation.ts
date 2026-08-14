import type { BelongsToRelationshipSchema, ValidationIssue } from "@verikit/core";
import { resolveScope } from "./access.js";
import { maybeCheckResourceOperation } from "./permissions.js";
import type { RouteTableEntry } from "./routing/route-table.js";

/**
 * `RouteTableEntry<TActor>` is generic to let `buildRouteTable` thread a
 * concrete actor type through at its call site, but this module (like
 * `handleCreate`/`handleUpdate`, which is all it's ever called from) treats
 * the actor as opaque  it's only ever forwarded to permission checks. Erase
 * it here rather than making every function in this file generic too,
 * mirroring `HandlerContext`'s own erasure (see its doc comment).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
type AnyRouteTableEntry = RouteTableEntry<any>;

/**
 * A resource's `belongsTo` relationships whose foreign key resolves to a
 * plain field name on this resource (i.e. authored via
 * `.via(resource.field("name"))`) exactly the ones a write can actually
 * submit a value for. Adapter-specific foreign key references don't name a
 * field this validation could read a submitted value from.
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
 * Verifies that a submitted `belongsTo` foreign key actually resolves for
 * the acting actor: the target record must exist, fall inside the target
 * resource's own actor-aware scope, and pass the target's record-level
 * `"read"` permission  the same three checks `GET {target}/:id` itself
 * enforces (see `handleFind`). A relationship whose target isn't registered
 * on this server can't be verified, so it's treated the same as an invalid
 * reference (fail closed) rather than silently allowed through.
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
 * Validates every `belongsTo` foreign key this write actually submits
 * against its target resource, closing the direct-API bypass where a client
 * ignores the relationship picker and writes another tenant's (or otherwise
 * inaccessible) record's id by hand.
 *
 * Only fields named in `clientFieldNames` are checked  those are the ones
 * the client actually controls. Server-owned values (from
 * `access.onCreate`/`access.scope`) are excluded: they're set by the
 * resource author's own code, not client input, so there's no bypass to
 * close there, and re-verifying them on every write would just be a wasted
 * round-trip. A foreign key submitted as `null`/`undefined` (clearing or
 * omitting the relation) is left to ordinary field validation
 * (`required`/`nullable`), not this check.
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

  return results.filter((issue): issue is ValidationIssue => issue !== undefined);
}
