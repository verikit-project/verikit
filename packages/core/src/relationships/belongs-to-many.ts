import { InferResource, Resource } from "../resource/resource.js";
import {
  RelationshipBuilder,
  RelationshipBuilderState,
} from "./shared/relationship-builder.js";

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

/** State for belongs-to-many builders: the shared shape plus the join resource name. */
interface BelongsToManyRelationshipBuilderState extends RelationshipBuilderState {
  through?: string;
}

/**
 * Fluent builder for many-to-many relationships resolved through a
 * join/through resource.
 */
export class BelongsToManyRelationshipBuilder<
  TResource extends Resource = Resource,
> extends RelationshipBuilder<
  TResource,
  BelongsToManyRelationshipBuilderState
> {
  readonly kind = "belongsToMany";

  constructor(
    target: () => TResource,
    state: BelongsToManyRelationshipBuilderState = {},
  ) {
    super(target, state);
  }

  /** Sets the join/through resource name linking the two sides. */
  through(resourceName: string): this {
    return this.withState({ through: resourceName });
  }

  /** Finalizes the builder into a `BelongsToManyRelationshipSchema`. */
  toSchema(name?: string): BelongsToManyRelationshipSchema {
    return {
      type: "relationship",
      relationshipType: "belongsToMany",
      name,
      resource: this.target().name,
      label: this.state.label,
      inverse: this.state.inverse,
      through: this.state.through,
      foreignKey: this.state.foreignKey,
      displayField: this.state.displayField,
    };
  }
}

/** Extracts the inferred array value type of a belongs-to-many relationship. */
export type InferBelongsToMany<TRelationship> =
  TRelationship extends BelongsToManyRelationshipBuilder<infer TResource>
    ? InferResource<TResource>[]
    : never;

/**
 * Creates a many-to-many relationship.
 * The target is provided as a thunk so resources can reference each other
 * before both are fully defined.
 */
export function belongsToMany<TResource extends Resource>(
  target: () => TResource,
): BelongsToManyRelationshipBuilder<TResource> {
  return new BelongsToManyRelationshipBuilder(target);
}
