import {
  InferResource,
  InferResourceFields,
  Resource,
} from "../resource/resource.js";

export interface HasManyRelationshipSchema {
  type: "relationship";
  relationshipType: "hasMany";
  name?: string;
  resource: string;
  label?: string;
  inverse?: string;
  foreignKey?: unknown;
  displayField?: string;
}

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

  resourceName(): string {
    return this.target().name;
  }

  label(label: string): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      label,
      this.inverseName,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  inverse(field: string): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      this.labelText,
      field,
      this.foreignKey,
      this.displayFieldName,
    );
  }

  via(foreignKey: unknown): HasManyRelationshipBuilder<TResource> {
    return new HasManyRelationshipBuilder(
      this.target,
      this.labelText,
      this.inverseName,
      foreignKey,
      this.displayFieldName,
    );
  }

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

export type InferHasMany<TRelationship> =
  TRelationship extends HasManyRelationshipBuilder<infer TResource>
    ? InferResource<TResource>[]
    : never;

export function hasMany<TResource extends Resource>(
  target: () => TResource,
): HasManyRelationshipBuilder<TResource> {
  return new HasManyRelationshipBuilder(target);
}
