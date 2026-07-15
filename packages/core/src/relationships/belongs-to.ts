import { InferResourceFields, Resource } from "../resource/resource.js";

export interface BelongsToRelationshipSchema {
  type: "relationship";
  relationshipType: "belongsTo";
  name?: string;
  resource: string;
  label?: string;
  inverse?: string;
  foreignKey?: unknown;
  displayField?: string;
}

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

  label(label: string): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      label,
      this.inverseName,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  inverse(field: string): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      this.labelText,
      field,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  via(foreignKey: unknown): BelongsToRelationshipBuilder<TResource> {
    return new BelongsToRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      foreignKey,
      this.displayFieldName,
    );
  }

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

export function belongsTo<TResource extends Resource>(
  target: () => TResource,
): BelongsToRelationshipBuilder<TResource> {
  return new BelongsToRelationshipBuilder(target);
}
