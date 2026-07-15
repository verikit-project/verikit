import {
  InferResource,
  InferResourceFields,
  Resource,
} from "../resource/resource.js";

/**
 * Schema describing a many-to-many relationship, typically resolved through
 * a join/through resource.
 */
export interface BelongsToManyRelationshipSchema {
  /** Literal "relationship" discriminator for discriminated unions. */
  type: "relationship";
  /** Literal discriminator identifying this as a belongs-to-many relationship. */
  relationshipType: "belongsToMany";
  /** Name of the relationship on its owning resource, set by `toSchema`. */
  name?: string;
  /** Name of the target resource this relationship points at. */
  resource: string;
  /** Display label shown to users in forms and tables. */
  label?: string;
  /** Name of the corresponding relationship field on the target resource. */
  inverse?: string;
  /** Name of the join/through resource linking the two sides. */
  through?: string;
  /** Foreign key column used by the join to look up matching rows. */
  foreignKey?: unknown;
  /** Field on the target resource shown when this relationship is rendered. */
  displayField?: string;
}

/**
 * Fluent builder for many-to-many relationships.
 *
 * A belongs-to-many relationship links this resource to many rows on the
 * target resource, typically resolved through a join/through resource
 * (e.g. a `book` belongs to many `tags` through a `bookTags` join table).
 */
export class BelongsToManyRelationshipBuilder<
  TResource extends Resource = Resource,
> {
  readonly kind = "belongsToMany";
  readonly target: () => TResource;
  private readonly labelText?: string;
  private readonly inverseName?: string;
  private readonly throughName?: string;
  private readonly foreignKey?: unknown;
  private readonly displayFieldName?: string;

  constructor(
    target: () => TResource,
    labelText?: string,
    inverseName?: string,
    throughName?: string,
    foreignKey?: unknown,
    displayFieldName?: string,
  ) {
    this.target = target;
    this.labelText = labelText;
    this.inverseName = inverseName;
    this.throughName = throughName;
    this.foreignKey = foreignKey;
    this.displayFieldName = displayFieldName;
  }

  /**
   * Name of the target resource this relationship points at.
   */
  resourceName(): string {
    return this.target().name;
  }

  /**
   * Set a human-readable label for the relationship.
   */
  label(label: string): BelongsToManyRelationshipBuilder<TResource> {
    return new BelongsToManyRelationshipBuilder(
      this.target,
      label,
      this.inverseName,
      this.throughName,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Name the corresponding relationship field on the target resource.
   */
  inverse(field: string): BelongsToManyRelationshipBuilder<TResource> {
    return new BelongsToManyRelationshipBuilder(
      this.target,
      this.labelText,
      field,
      this.throughName,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Set the join/through resource used to resolve the many-to-many link.
   */
  through(resourceName: string): BelongsToManyRelationshipBuilder<TResource> {
    return new BelongsToManyRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      resourceName,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Set the foreign key column used by the join to look up matching rows.
   */
  via(foreignKey: unknown): BelongsToManyRelationshipBuilder<TResource> {
    return new BelongsToManyRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      this.throughName,
      foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Choose which field on the target resource is shown when this
   * relationship is rendered (e.g. in a multi-select or table cell).
   */
  displayField(
    field: keyof InferResourceFields<TResource> & string,
  ): BelongsToManyRelationshipBuilder<TResource> {
    return new BelongsToManyRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      this.throughName,
      this.foreignKey,
      field,
    );
  }

  /**
   * Finalize the builder and produce a `BelongsToManyRelationshipSchema`.
   *
   * @param name - The relationship's name on its owning resource.
   */
  toSchema(name?: string): BelongsToManyRelationshipSchema {
    return {
      type: "relationship",
      relationshipType: "belongsToMany",
      name,
      resource: this.target().name,
      label: this.labelText,
      inverse: this.inverseName,
      through: this.throughName,
      foreignKey: this.foreignKey,
      displayField: this.displayFieldName,
    };
  }
}

/** Utility type extracting the inferred array value type of a belongs-to-many relationship. */
export type InferBelongsToMany<TRelationship> =
  TRelationship extends BelongsToManyRelationshipBuilder<infer TResource>
    ? InferResource<TResource>[]
    : never;

/**
 * Create a many-to-many relationship targeting the resource returned by
 * `target`. The target is passed as a thunk so resources can reference each
 * other before both are fully defined, avoiding circular import issues.
 */
export function belongsToMany<TResource extends Resource>(
  target: () => TResource,
): BelongsToManyRelationshipBuilder<TResource> {
  return new BelongsToManyRelationshipBuilder(target);
}
