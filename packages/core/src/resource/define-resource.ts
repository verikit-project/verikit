import {
  AnyActionBuilder,
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
  const TActions extends readonly AnyActionBuilder[] = readonly [],
>(
  name: TName,
  config: ResourceConfig<TFields, TTable, TRelationships, TActions>,
): Resource<TName, TFields, TTable, TRelationships, TActions> {
  return new Resource(name, config);
}
