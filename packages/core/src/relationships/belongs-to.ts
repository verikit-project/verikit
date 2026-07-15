import { InferResourceFields, Resource } from "../resource/resource.js";

/**
 * Schema describing a belongs-to relationship: this resource stores the
 * foreign key and points at exactly one row on the target resource.
 */
export interface BelongsToRelationshipSchema {
  /** Literal "relationship" discriminator for discriminated unions. */
  type: "relationship";
  /** Literal discriminator identifying this as a belongs-to relationship. */
  relationshipType: "belongsTo";
  /** Name of the relationship on its owning resource, set by `toSchema`. */
  name?: string;
  /** Name of the target resource this relationship points at. */
  resource: string;
  /** Display label shown to users in forms and tables. */
  label?: string;
  /** Name of the corresponding relationship field on the target resource. */
  inverse?: string;
  /** Foreign key column (on this resource) used to look up the target row. */
  foreignKey?: unknown;
  /** Field on the target resource shown when this relationship is rendered. */
  displayField?: string;
}

/**
 * Fluent builder for belongs-to relationships.
 *
 * A belongs-to relationship means this resource holds the foreign key and
 * points at exactly one row on the target resource (e.g. a `book` belongs
 * to an `author`).
 */
export class BelongsToRelationshipBuilder<
  TResource extends Resource = Resource,
> {
  readonly target: () => TResource;
  private readonly labelText?: string;
  private readonly inverseName?: string;
  private readonly foreignKey?: unknown;
  private readonly displayFieldName?: string;

  constructor(
    target: () => TResource,
    labelText?: string,
    inverseName?: string,
    foreignKey?: unknown,
    displayFieldName?: string,
  ) {
    this.target = target;
    this.labelText = labelText;
    this.inverseName = inverseName;
    this.foreignKey = foreignKey;
    this.displayFieldName = displayFieldName;
  }

  /**
   * Set a human-readable label for the relationship.
   */
  label(label: string): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      label,
      this.inverseName,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Name the corresponding relationship field on the target resource.
   */
  inverse(field: string): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      this.labelText,
      field,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Set the foreign key column (on this resource) used to look up the
   * target resource.
   */
  via(foreignKey: unknown): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Choose which field on the target resource is shown when this
   * relationship is rendered (e.g. in a select input or table cell).
   */
  displayField(
    field: keyof InferResourceFields<TResource> & string,
  ): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      this.foreignKey,
      field,
    );
  }

  /**
   * Finalize the builder and produce a `BelongsToRelationshipSchema`.
   *
   * @param name - The relationship's name on its owning resource.
   */
  toSchema(name?: string): BelongsToRelationshipSchema {
    return {
      type: "relationship",
      relationshipType: "belongsTo",
      name,
      resource: this.target().name,
      label: this.labelText,
      inverse: this.inverseName,
      foreignKey: this.foreignKey,
      displayField: this.displayFieldName,
    };
  }
}

/**
 * Create a belongs-to relationship targeting the resource returned by
 * `target`. The target is passed as a thunk so resources can reference each
 * other before both are fully defined, avoiding circular import issues.
 */
export function belongsTo<TResource extends Resource>(
  target: () => TResource,
): BelongsToRelationshipBuilder<TResource> {
  return new BelongsToRelationshipBuilder(target);
}
