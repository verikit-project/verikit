import { InferResource, Resource } from "../resource/resource.js";

export interface HasManyRelationship<TResource extends Resource = Resource> {
  kind: "hasMany";
  target: () => TResource;
  resourceName: () => string;
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
  };
}
