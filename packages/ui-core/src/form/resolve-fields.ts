import type { Resource, ResourceSchema } from "@verikit/core";
import type { VerikitFormFields } from "./submission.js";

/** Source accepted by a flat Verikit form: a field map, a resource builder, or its schema. */
export type VerikitFormSource = VerikitFormFields | Resource | ResourceSchema;

/** Returns true when a source is a resource builder. */
export function isResource(value: VerikitFormSource): value is Resource {
  return typeof (value as Resource).toSchema === "function";
}

function isResourceSchema(value: VerikitFormSource): value is ResourceSchema {
  return (value as ResourceSchema).type === "resource";
}

/** Resolves any supported form source into a field schema map. */
export function resolveVerikitFields(
  source: VerikitFormSource,
): VerikitFormFields {
  if (isResource(source)) {
    return source.toSchema().fields;
  }

  if (isResourceSchema(source)) {
    return source.fields as VerikitFormFields;
  }

  return source;
}
