import { InferResource, Resource } from "../resource/resource.js";
import {
  RelationshipBuilder,
  RelationshipBuilderState,
} from "./shared/relationship-builder.js";

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
export class HasManyRelationshipBuilder<
  TResource extends Resource = Resource,
> extends RelationshipBuilder<TResource, RelationshipBuilderState> {
  readonly kind = "hasMany";

  constructor(target: () => TResource, state: RelationshipBuilderState = {}) {
    super(target, state);
  }

  /** Finalizes the builder into a `HasManyRelationshipSchema`. */
  toSchema(name?: string): HasManyRelationshipSchema {
    return {
      type: "relationship",
      relationshipType: "hasMany",
      name,
      resource: this.target().name,
      label: this.state.label,
      inverse: this.state.inverse,
      foreignKey: this.state.foreignKey,
      displayField: this.state.displayField,
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
