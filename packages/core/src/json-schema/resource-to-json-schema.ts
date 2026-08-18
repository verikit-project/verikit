import { Resource, ResourceSchema } from "../resource/resource.js";
import type { RelationshipSchema } from "../resource/resource.js";
import {
  fieldsToJsonSchema,
  JsonSchemaObject,
  JsonSchemaOperation,
} from "./fields-to-json-schema.js";
import type { JsonSchemaValue } from "./json-schema-value.js";

/** `resourceToJsonSchema()`'s output: a `JsonSchemaObject` with resource identity attached. */
export interface ResourceJsonSchema extends JsonSchemaObject {
  $schema: string;
  title: string;
}

const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

/**
 * Maps relationships to JSON Schema: `belongsTo` surfaces as a settable/readable
 * id reference in create/update/response; `hasMany`/`belongsToMany` appear in
 * response only (omitted from create/update to prevent nested mutations, since
 * @verikit/server doesn't auto-populate relationship data).
 */
function relationshipToJsonSchema(
  relationship: RelationshipSchema,
  operation: JsonSchemaOperation,
): JsonSchemaValue | undefined {
  if (relationship.relationshipType === "belongsTo") {
    return {
      type: "string",
      description: `Id reference to the related "${relationship.resource}" resource.`,
    };
  }

  if (operation !== "response") {
    return undefined;
  }

  return {
    type: "array",
    items: { type: "string" },
    description: `Array of id references to related "${relationship.resource}" resources. Not populated by default; requires an explicit include mechanism.`,
  };
}

/**
 * Derives operation-scoped JSON Schema for a resource: its fields
 * (via `fieldsToJsonSchema()`) and relationships as id references only.
 * Accepts a `Resource` or finalized `ResourceSchema`.
 */
export function resourceToJsonSchema(
  resource: Resource | ResourceSchema,
  options: { operation: JsonSchemaOperation },
): ResourceJsonSchema {
  const { operation } = options;
  const resourceSchema =
    resource instanceof Resource ? resource.toSchema() : resource;

  const { properties, required, ...rest } = fieldsToJsonSchema(
    resourceSchema.fields,
    { operation },
  );

  const mergedProperties = { ...properties };
  for (const [name, relationship] of Object.entries(
    resourceSchema.relationships,
  )) {
    const relationshipSchema = relationshipToJsonSchema(
      relationship,
      operation,
    );
    if (relationshipSchema) {
      mergedProperties[name] = relationshipSchema;
    }
  }

  return {
    ...rest,
    $schema: JSON_SCHEMA_DIALECT,
    title: resourceSchema.name,
    type: "object",
    properties: mergedProperties,
    ...(required && { required }),
    additionalProperties: false,
  };
}
