import { InferResource, Resource } from "../resource/resource.js";

export interface BelongsToRelationshipSchema {
  type: "relationship";
  relationshipType: "belongsTo";
  name?: string;
  resource: string;
  foreignKey?: unknown;
  displayField?: string;
}

export class BelongsToRelationshipBuilder<
  TResource extends Resource = Resource,
> {
  readonly target: () => TResource;
  private readonly foreignKey?: unknown;
  private readonly displayFieldName?: string;

  constructor(
    target: () => TResource,
    foreignKey?: unknown,
    displayFieldName?: string,
  ) {
    this.target = target;
    this.foreignKey = foreignKey;
    this.displayFieldName = displayFieldName;
  }

  via(foreignKey: unknown): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      foreignKey,
      this.displayFieldName,
    );
  }

  displayField(
    field: keyof InferResource<TResource> & string,
  ): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      this.foreignKey,
      field,
    );
  }

  toSchema(name?: string): BelongsToRelationshipSchema {
    return {
      type: "relationship",
      relationshipType: "belongsTo",
      name,
      resource: this.target().name,
      foreignKey: this.foreignKey,
      displayField: this.displayFieldName,
    };
  }
}

export function belongsTo<TResource extends Resource>(
  target: () => TResource,
): BelongsToRelationshipBuilder<TResource> {
  return new BelongsToRelationshipBuilder(target);
}
