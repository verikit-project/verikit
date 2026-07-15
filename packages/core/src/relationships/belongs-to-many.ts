import {
  InferResource,
  InferResourceFields,
  Resource,
} from "../resource/resource.js";

export interface BelongsToManyRelationshipSchema {
  type: "relationship";
  relationshipType: "belongsToMany";
  name?: string;
  resource: string;
  label?: string;
  inverse?: string;
  through?: string;
  foreignKey?: unknown;
  displayField?: string;
}

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

  resourceName(): string {
    return this.target().name;
  }

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

export type InferBelongsToMany<TRelationship> =
  TRelationship extends BelongsToManyRelationshipBuilder<infer TResource>
    ? InferResource<TResource>[]
    : never;

export function belongsToMany<TResource extends Resource>(
  target: () => TResource,
): BelongsToManyRelationshipBuilder<TResource> {
  return new BelongsToManyRelationshipBuilder(target);
}
