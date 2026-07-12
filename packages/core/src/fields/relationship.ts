import { FieldBuilder, FieldSchema } from "./base.js";
import { InferResource, Resource } from "../resource/resource.js";

export interface RelationshipFieldSchema extends FieldSchema {
  fieldType: "belongsTo";
  relationship: {
    kind: "belongsTo";
    resource: string;
    foreignKey?: unknown;
    displayField?: string;
  };
}

export class BelongsToFieldBuilder<
  TResource extends Resource = Resource,
  TValue = InferResource<TResource> | null | undefined,
> extends FieldBuilder<TValue, RelationshipFieldSchema> {
  readonly target: () => TResource;
  private readonly foreignKey?: unknown;
  private readonly displayFieldName?: string;

  constructor(
    target: () => TResource,
    state: Omit<RelationshipFieldSchema, "type" | "name" | "relationship"> = {
      fieldType: "belongsTo",
    },
    foreignKey?: unknown,
    displayFieldName?: string,
  ) {
    super(state as Omit<RelationshipFieldSchema, "type" | "name">);
    this.target = target;
    this.foreignKey = foreignKey;
    this.displayFieldName = displayFieldName;
  }

  via(foreignKey: unknown): BelongsToFieldBuilder<TResource, TValue> {
    return new BelongsToFieldBuilder(
      this.target,
      this.state,
      foreignKey,
      this.displayFieldName,
    );
  }

  displayField(
    field: keyof InferResource<TResource> & string,
  ): BelongsToFieldBuilder<TResource, TValue> {
    return new BelongsToFieldBuilder(
      this.target,
      this.state,
      this.foreignKey,
      field,
    );
  }

  override toSchema(name: string): RelationshipFieldSchema {
    const resource = this.target();

    return {
      ...super.toSchema(name),
      fieldType: "belongsTo",
      relationship: {
        kind: "belongsTo",
        resource: resource.name,
        foreignKey: this.foreignKey,
        displayField: this.displayFieldName,
      },
    };
  }
}

export function belongsTo<TResource extends Resource>(
  target: () => TResource,
): BelongsToFieldBuilder<TResource> {
  return new BelongsToFieldBuilder(target);
}
