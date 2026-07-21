import { InferResourceFields, Resource } from "../../resource/resource.js";
import type { FieldReference } from "../../resource/resource.js";

type AdapterForeignKeyReference = object;

export type RelationshipForeignKey =
  FieldReference<string> | AdapterForeignKeyReference;

/** State shared by every relationship builder, one slot per fluent setter. */
export interface RelationshipBuilderState {
  label?: string;
  inverse?: string;
  foreignKey?: RelationshipForeignKey;
  displayField?: string;
}

type BuilderConstructor<TBuilder, TResource extends Resource, TState> = new (
  target: () => TResource,
  state: TState,
) => TBuilder;

/**
 * Base class for relationship builders using immutable state cloning,
 * mirroring the FieldBuilder pattern.
 */
export abstract class RelationshipBuilder<
  TResource extends Resource = Resource,
  TState extends RelationshipBuilderState = RelationshipBuilderState,
> {
  readonly target: () => TResource;
  protected readonly state: TState;

  constructor(target: () => TResource, state: TState) {
    this.target = target;
    this.state = state;
  }

  /**
   * Creates a new instance of the current concrete builder (via
   * `this.constructor`) so subclass setters stay available after chaining.
   */
  protected withState(patch: Partial<TState>): this {
    const Builder = this.constructor as BuilderConstructor<
      this,
      TResource,
      TState
    >;

    return new Builder(this.target, { ...this.state, ...patch });
  }

  /** Returns the name of the target resource. */
  resourceName(): string {
    return this.target().name;
  }

  /** Sets a human-readable label for the relationship. */
  label(label: string): this {
    return this.withState({ label } as Partial<TState>);
  }

  /** Sets the inverse relationship on the target resource. */
  inverse(field: string): this {
    return this.withState({ inverse: field } as Partial<TState>);
  }

  /**
   * Sets the foreign key used to look up matching rows.
   *
   * Pass `resource.field("name")` or the field helper from
   * `defineResource({ relationships: (field) => ... })` for compile-time
   * checked resource field names. Adapter-specific column reference objects
   * are also accepted.
   */
  via(foreignKey: RelationshipForeignKey): this {
    return this.withState({ foreignKey } as Partial<TState>);
  }

  /** Sets the field displayed for related records. */
  displayField(field: keyof InferResourceFields<TResource> & string): this {
    return this.withState({ displayField: field } as Partial<TState>);
  }
}
