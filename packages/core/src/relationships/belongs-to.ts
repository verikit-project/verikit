import { Resource } from "../resource/resource.js";
import {
  RelationshipBuilder,
  RelationshipBuilderState,
} from "./shared/relationship-builder.js";

/**
 * Schema describing a belongs-to relationship.
 * This resource stores the foreign key to the target resource.
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
 * Fluent builder for belongs-to relationships: this resource holds the
 * foreign key.
 */
export class BelongsToRelationshipBuilder<
  TResource extends Resource = Resource,
> extends RelationshipBuilder<TResource, RelationshipBuilderState> {
  readonly kind = "belongsTo";

  constructor(target: () => TResource, state: RelationshipBuilderState = {}) {
    super(target, state);
  }

  /** Finalizes the builder into a `BelongsToRelationshipSchema`. */
  toSchema(name?: string): BelongsToRelationshipSchema {
    return {
      type: "relationship",
      relationshipType: "belongsTo",
      name,
      resource: this.target().name,
      label: this.state.label,
      inverse: this.state.inverse,
      foreignKey: this.state.foreignKey,
      displayField: this.state.displayField,
    };
  }
}

/**
 * Creates a belongs-to relationship.
 * The target is provided as a thunk so resources can reference each other
 * before both are fully defined.
 */
export function belongsTo<TResource extends Resource>(
  target: () => TResource,
): BelongsToRelationshipBuilder<TResource> {
  return new BelongsToRelationshipBuilder(target);
}
