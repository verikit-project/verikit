import type { BelongsToRelationshipSchema } from "@verikit/core";
import { resolveScope } from "./access.js";
import {
  maybeCheckResourceOperation,
  unreadableFieldNames,
} from "./permissions.js";
import { resolvableBelongsToRelationships } from "./relationship-validation.js";
import type { RouteTableEntry } from "./routing/route-table.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the actor is only forwarded to permission checks
type AnyRouteTableEntry = RouteTableEntry<any>;

/**
 * Display labels for a response's `belongsTo` relationships, sent as
 * `meta.relationships` when a list or find request asks for
 * `include=relationships`: relationship name, then foreign-key value, then the
 * related record's `displayField` value as a string. A key the actor can't
 * see the label for is left out.
 */
export type RelationshipLabels = Record<string, Record<string, string>>;

/** Distinct, non-null foreign-key values on `records`, as canonical string ids. */
function foreignKeyIds(
  records: readonly Record<string, unknown>[],
  foreignKey: string,
): string[] {
  const ids = new Set<string>();

  for (const record of records) {
    const value = record[foreignKey];

    if (value !== null && value !== undefined) {
      ids.add(String(value));
    }
  }

  return [...ids];
}

/**
 * Looks up one relationship's labels with a single `ids` query to its target.
 * A label is returned only when the actor could open that record: it's in the
 * actor's scope, the target's `read` permission allows it, and its
 * `displayField` is readable on it.
 */
async function labelsFor(
  target: AnyRouteTableEntry,
  relationship: BelongsToRelationshipSchema & { displayField: string },
  ids: readonly string[],
  actor: unknown,
): Promise<Record<string, string>> {
  if (ids.length === 0) {
    return {};
  }

  const scope = await resolveScope(target, actor);
  const result = await target.config.adapter.list({
    page: 1,
    pageSize: ids.length,
    ids,
    ...(scope && { scope }),
  });
  const requested = new Set(ids);
  const entries = await Promise.all(
    (result.records as Record<string, unknown>[]).map(async (record) => {
      const id = String(record.id);
      // Guards against an adapter that ignores `ids`.
      if (!requested.has(id)) return undefined;

      const permission = await maybeCheckResourceOperation(
        target.config.permissions,
        "read",
        { actor, record },
      );
      if (!permission.allowed) return undefined;

      const hidden = await unreadableFieldNames(
        target.fields,
        target.config.permissions,
        { actor, record },
      );
      const value = record[relationship.displayField];

      return hidden.has(relationship.displayField) ||
        value === null ||
        value === undefined
        ? undefined
        : ([id, String(value)] as const);
    }),
  );

  return Object.fromEntries(entries.filter((entry) => entry !== undefined));
}

/**
 * Builds `meta.relationships` for already-presented `records` (so a foreign
 * key the actor can't read never yields a label). Covers every `belongsTo`
 * relationship with a field foreign key, a `displayField`, and a registered
 * target; each one costs a single query, however many records there are.
 */
export async function relationshipLabels(
  entry: AnyRouteTableEntry,
  table: readonly AnyRouteTableEntry[],
  records: readonly Record<string, unknown>[],
  actor: unknown,
): Promise<RelationshipLabels> {
  const lookups = resolvableBelongsToRelationships(entry).flatMap(
    (relationship) => {
      const target = table.find(
        (candidate) => candidate.config.resource.name === relationship.resource,
      );

      return target && relationship.displayField
        ? [
            {
              target,
              relationship: relationship as BelongsToRelationshipSchema & {
                displayField: string;
              },
            },
          ]
        : [];
    },
  );

  const resolved = await Promise.all(
    lookups.map(
      async ({ target, relationship }) =>
        [
          relationship.name!,
          await labelsFor(
            target,
            relationship,
            foreignKeyIds(records, relationship.foreignKey as string),
            actor,
          ),
        ] as const,
    ),
  );

  return Object.fromEntries(resolved);
}
