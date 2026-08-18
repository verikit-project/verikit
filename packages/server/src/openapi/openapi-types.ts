import type { JsonSchemaValue } from "@verikit/core";

/** Reference to a `components.schemas` entry. */
export interface OpenApiRef {
  $ref: string;
}

/**
 * Extends `JsonSchemaValue` to allow nested OpenAPI `$ref` objects in
 * `items` and `properties`.
 *
 * Core JSON Schema values don't support `$ref`, while OpenAPI schemas
 * routinely use references in nested positions such as array items.
 */
export interface OpenApiSchemaObject extends Omit<
  JsonSchemaValue,
  "items" | "properties"
> {
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
}

/** An OpenAPI schema is either an inline JSON Schema value or a component reference. */
export type OpenApiSchema = OpenApiSchemaObject | OpenApiRef;

export interface ParameterObject {
  name: string;
  in: "path" | "query";
  required?: boolean;
  description?: string;
  schema: OpenApiSchema;
  style?: "deepObject";
  explode?: boolean;
}

export interface MediaTypeObject {
  schema: OpenApiSchema;
}

export interface RequestBodyObject {
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

export interface OperationObject {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  /** Always includes a `default` entry (built via `baseResponses()`), plus per-status entries. */
  responses: Record<string, ResponseObject>;
}

export interface PathItemObject {
  get?: OperationObject;
  post?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
}

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
}

/**
 * Minimal, dependency-free OpenAPI 3.1 types used by
 * `generateOpenApiDocument()`.
 *
 * Schema types build on `@verikit/core`'s JSON Schema representation,
 * extended where needed for OpenAPI references.
 */
export interface OpenApiDocument {
  openapi: "3.1.0";
  info: OpenApiInfo;
  servers?: { url: string }[];
  paths: Record<string, PathItemObject>;
  components: {
    schemas: Record<string, JsonSchemaValue>;
  };
}
