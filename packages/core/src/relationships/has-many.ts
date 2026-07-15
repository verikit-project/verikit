import {
  InferResource,
  InferResourceFields,
  Resource,
} from "../resource/resource.js";

/**
 * Schema describing a has-many relationship.
 * The target resource stores the foreign key to this resource.
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
 * The target resource stores the foreign key to this resource.
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

  /** Returns the name of the target resource. */
  resourceName(): string {
    return this.target().name;
  }

  /** Sets a human-readable label for the relationship. */
  label(label: string): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      label,
      this.inverseName,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /** Sets the inverse relationship on the target resource. */
  inverse(field: string): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      this.labelText,
      field,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  /** Sets the foreign key column on the target resource. */
  via(foreignKey: unknown): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      foreignKey,
      this.displayFieldName,
    );
  }

  /** Sets the target field used to represent related records. */
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

  /** Finalizes the builder into a `HasManyRelationshipSchema`. */
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

/** Extracts the inferred array value type of a has-many relationship. */
export type InferHasMany<TRelationship> =
  TRelationship extends HasManyRelationshipBuilder<infer TResource>
    ? InferResource<TResource>[]
    : never;

/**
 * Creates a has-many relationship.
 * The target is provided as a thunk so resources can reference each other
 * before both are fully defined.
 */
export function hasMany<TResource extends Resource>(
  target: () => TResource,
): HasManyRelationshipBuilder<TResource> {
  return new HasManyRelationshipBuilder(target);
}
