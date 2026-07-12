import { InferResource, Resource } from "../resource/resource.js";

export interface BelongsToManyRelationship<
  TResource extends Resource = Resource,
> {
  kind: "belongsToMany";
  target: () => TResource;
  resourceName: () => string;
}

export type InferBelongsToMany<TRelationship> =
  TRelationship extends BelongsToManyRelationship<infer TResource>
    ? InferResource<TResource>[]
    : never;

export function belongsToMany<TResource extends Resource>(
  target: () => TResource,
): BelongsToManyRelationship<TResource> {
  return {
    kind: "belongsToMany",
    target,
    resourceName: () => target().name,
  };
}
