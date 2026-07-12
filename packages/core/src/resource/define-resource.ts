import { FieldMap, Resource, ResourceConfig } from "./resource.js";

export function defineResource<
  const TName extends string,
  const TFields extends FieldMap,
  TTable = unknown,
>(
  name: TName,
  config: ResourceConfig<TFields, TTable>,
): Resource<TName, TFields, TTable> {
  return new Resource(name, config);
}
