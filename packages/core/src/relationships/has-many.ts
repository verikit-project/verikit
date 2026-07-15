import {
  InferResource,
  InferResourceFields,
  Resource,
} from "../resource/resource.js";

/**
 * Schema describing a has-many relationship: the target resource stores the
 * foreign key, and this resource can be linked to many rows on it.
 */
export interface HasManyRelationshipSchema {
  /** Literal "relationship" discriminator for discriminated unions. */
  type: "relationship";
  /** Literal discriminator identifying this as a has-many relationship. */
  relationshipType: "hasMany";
  /** Name of the relationship on its owning resource, set by `toSchema`. */
  name?: string;
  /** Name of the target resource this relationship points at. */
  resource: string;
  /** Display label shown to users in forms and tables. */
  label?: string;
  /** Name of the corresponding relationship field on the target resource. */
  inverse?: string;
  /** Foreign key column (on the target resource) used to find matching rows. */
  foreignKey?: unknown;
  /** Field on the target resource shown when this relationship is rendered. */
  displayField?: string;
}

/**
 * Fluent builder for has-many relationships.
 *
 * A has-many relationship means the target resource holds the foreign key,
 * and this resource can be linked to many rows on it (e.g. an `author` has
 * many `books`).
 */
export class HasManyRelationshipBuilder<TResource extends Resource = Resource> {
  readonly kind = "hasMany";
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
   * Name of the target resource this relationship points at.
   */
  resourceName(): string {
    return this.target().name;
  }

  /**
   * Set a human-readable label for the relationship.
   */
  label(label: string): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
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
  inverse(field: string): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      this.labelText,
      field,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Set the foreign key column (on the target resource) used to find rows
   * that belong to this resource.
   */
  via(foreignKey: unknown): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      foreignKey,
      this.displayFieldName,
    );
  }

  /**
   * Choose which field on the target resource is shown when this
   * relationship is rendered (e.g. in a list or table cell).
   */
  displayField(
    field: keyof InferResourceFields<TResource> & string,
  ): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      this.foreignKey,
      field,
    );
  }

  /**
   * Finalize the builder and produce a `HasManyRelationshipSchema`.
   *
   * @param name - The relationship's name on its owning resource.
   */
  toSchema(name?: string): HasManyRelationshipSchema {
    return {
      type: "relationship",
      relationshipType: "hasMany",
      name,
      resource: this.target().name,
      label: this.labelText,
      inverse: this.inverseName,
      foreignKey: this.foreignKey,
      displayField: this.displayFieldName,
    };
  }
}

/** Utility type extracting the inferred array value type of a has-many relationship. */
export type InferHasMany<TRelationship> =
  TRelationship extends HasManyRelationshipBuilder<infer TResource>
    ? InferResource<TResource>[]
    : never;

/**
 * Create a has-many relationship targeting the resource returned by
 * `target`. The target is passed as a thunk so resources can reference each
 * other before both are fully defined, avoiding circular import issues.
 */
export function hasMany<TResource extends Resource>(
  target: () => TResource,
): HasManyRelationshipBuilder<TResource> {
  return new HasManyRelationshipBuilder(target);
}
