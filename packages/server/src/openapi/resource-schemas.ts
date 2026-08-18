import {
  fieldsToJsonSchema,
  resourceToJsonSchema,
  type JsonSchemaValue,
} from "@verikit/core";
import type { RouteTableEntry } from "../routing/route-table.js";

/** Strips `resourceToJsonSchema()`'s `$schema`/`title` wrapper keys, which a `components.schemas` entry doesn't repeat. */
function asComponentSchema(
  schema: ReturnType<typeof resourceToJsonSchema>,
): JsonSchemaValue {
  const { $schema: _$schema, title: _title, ...rest } = schema;
  return rest;
}

/**
 * Builds the resource's `components.schemas` entries for create, update,
 * and response shapes using `resourceToJsonSchema()`.
 *
 * Configured actions also receive an input schema derived from their form
 * fields using create semantics.
 */
export function resourceComponentSchemas<TActor>(
  entry: RouteTableEntry<TActor>,
): Record<string, JsonSchemaValue> {
  const { resource } = entry.config;
  const name = resource.name;

  const schemas: Record<string, JsonSchemaValue> = {
    [`${name}Create`]: asComponentSchema(
      resourceToJsonSchema(resource, { operation: "create" }),
    ),
    [`${name}Update`]: asComponentSchema(
      resourceToJsonSchema(resource, { operation: "update" }),
    ),
    [name]: asComponentSchema(
      resourceToJsonSchema(resource, { operation: "response" }),
    ),
  };

  for (const action of entry.config.actions ?? []) {
    const form = action.toSchema().form;
    if (form) {
      schemas[`${name}${capitalize(action.name)}Input`] = fieldsToJsonSchema(
        form,
        { operation: "create" },
      );
    }
  }

  return schemas;
}

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : (value[0] as string).toUpperCase() + value.slice(1);
}
