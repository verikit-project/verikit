import type {
  BelongsToRelationshipSchema,
  FieldSchema,
  Resource,
  ResourceSchema,
} from "@verikit/core";

/** Display labels from a list's `relationships`, keyed by relationship name then foreign-key value. */
export type RelationshipLabelMap = Record<string, Record<string, string>>;

/** A table column backed by one of the resource's fields. */
export interface FieldColumnSpec {
  kind: "field";
  field: FieldSchema;
}

/**
 * A table column showing a `belongsTo` relationship's related record, in
 * place of its foreign-key field.
 */
export interface RelationshipColumnSpec {
  kind: "relationship";
  /** Relationship name, used as the column id. */
  name: string;
  /** Column header: the relationship's label, else its foreign key's, else its name. */
  label: string;
  /** Field on this resource holding the related record's id. */
  foreignKey: string;
}

export type ResourceColumnSpec = FieldColumnSpec | RelationshipColumnSpec;

function resourceSchema(source: Resource | ResourceSchema): ResourceSchema {
  return "toSchema" in source && typeof source.toSchema === "function"
    ? source.toSchema()
    : (source as ResourceSchema);
}

/** Options for {@link resourceColumnSpecs}. */
export interface ResourceColumnSpecOptions {
  /**
   * `"table"` (the default) leaves out fields marked `.hidden()` or
   * `.tableHidden()`; `"detail"`, for a record page, leaves out only
   * `.hidden()` ones.
   */
  view?: "table" | "detail";
}

/**
 * The columns a resource table (or the rows a record page) shows, in field
 * order. A `belongsTo` relationship whose foreign key is one of the
 * resource's fields gets a column where that field is, replacing the field's
 * own column, and is shown even when the field is hidden (as generated
 * foreign keys are). Other hidden fields are left out; see
 * {@link ResourceColumnSpecOptions.view}.
 */
export function resourceColumnSpecs(
  source: Resource | ResourceSchema,
  { view = "table" }: ResourceColumnSpecOptions = {},
): ResourceColumnSpec[] {
  const schema = resourceSchema(source);
  const byForeignKey = new Map<string, BelongsToRelationshipSchema>();

  for (const [name, relationship] of Object.entries(schema.relationships)) {
    if (
      relationship.relationshipType === "belongsTo" &&
      typeof relationship.foreignKey === "string" &&
      Object.hasOwn(schema.fields, relationship.foreignKey) &&
      !byForeignKey.has(relationship.foreignKey)
    ) {
      byForeignKey.set(relationship.foreignKey, { ...relationship, name });
    }
  }

  return Object.values(schema.fields).flatMap(
    (field: FieldSchema): ResourceColumnSpec[] => {
      const relationship = byForeignKey.get(field.name);

      if (relationship) {
        return [
          {
            kind: "relationship",
            name: relationship.name!,
            label: relationship.label ?? field.label ?? relationship.name!,
            foreignKey: field.name,
          },
        ];
      }

      return field.hidden || (view === "table" && field.tableHidden)
        ? []
        : [{ kind: "field", field }];
    },
  );
}

/**
 * True when a table of `source` should ask the server for relationship
 * labels: it has a relationship column with a `displayField` to show.
 */
export function needsRelationshipLabels(
  source: Resource | ResourceSchema,
): boolean {
  const schema = resourceSchema(source);

  return resourceColumnSpecs(schema).some(
    (spec) =>
      spec.kind === "relationship" &&
      schema.relationships[spec.name]!.displayField !== undefined,
  );
}

/**
 * The text a relationship cell shows: the related record's label when the
 * server sent one, otherwise the raw foreign key (empty when there is none).
 */
export function relationshipCellText(
  labels: RelationshipLabelMap | undefined,
  spec: RelationshipColumnSpec,
  record: Record<string, unknown>,
): string {
  const value = record[spec.foreignKey];

  if (value === null || value === undefined) {
    return "";
  }

  return labels?.[spec.name]?.[String(value)] ?? String(value);
}
