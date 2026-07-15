import { InferResource, Resource } from "../resource/resource.js";

export interface HasManyRelationshipSchema {
  type: "relationship";
  relationshipType: "hasMany";
  name?: string;
  resource: string;
}

export interface HasManyRelationship<TResource extends Resource = Resource> {
  kind: "hasMany";
  target: () => TResource;
  resourceName: () => string;
  toSchema: (name?: string) => HasManyRelationshipSchema;
}

export type InferHasMany<TRelationship> =
  TRelationship extends HasManyRelationship<infer TResource>
    ? InferResource<TResource>[]
    : never;

export function hasMany<TResource extends Resource>(
  target: () => TResource,
): HasManyRelationship<TResource> {
  return {
    kind: "hasMany",
    target,
    resourceName: () => target().name,
    toSchema: (name) => ({
      type: "relationship",
      relationshipType: "hasMany",
      name,
      resource: target().name,
    }),
  };
}
