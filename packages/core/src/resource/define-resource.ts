import {
  FieldMap,
  RelationshipMap,
  Resource,
  ResourceConfig,
} from "./resource.js";

/** Creates a `Resource` from a name and field/relationship configuration. */
export function defineResource<
  const TName extends string,
  const TFields extends FieldMap,
  TTable = unknown,
  TRelationships extends RelationshipMap = RelationshipMap,
>(
  name: TName,
  config: ResourceConfig<TFields, TTable, TRelationships>,
): Resource<TName, TFields, TTable, TRelationships> {
  return new Resource(name, config);
}
