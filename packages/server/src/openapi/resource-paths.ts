import { fieldToJsonSchema, type FieldSchema } from "@verikit/core";
import type { RouteTableEntry } from "../routing/route-table.js";
import type {
  OpenApiSchema,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ResponseObject,
} from "./openapi-types.js";

const ERROR_REF: OpenApiSchema = { $ref: "#/components/schemas/Error" };
const NOT_FOUND_REF: OpenApiSchema = {
  $ref: "#/components/schemas/NotFoundError",
};
const FORBIDDEN_REF: OpenApiSchema = {
  $ref: "#/components/schemas/ForbiddenError",
};

function jsonResponse(
  description: string,
  schema: OpenApiSchema,
): ResponseObject {
  return { description, content: { "application/json": { schema } } };
}

function defaultResponse(): ResponseObject {
  return jsonResponse("Unexpected error.", ERROR_REF);
}

function notFoundResponse(): ResponseObject {
  return jsonResponse("No record matches this id.", NOT_FOUND_REF);
}

function forbiddenResponse(): ResponseObject {
  return jsonResponse("Not permitted for the current actor.", FORBIDDEN_REF);
}

function baseResponses(
  hasPermissions: boolean,
): Record<string, ResponseObject> {
  const responses: Record<string, ResponseObject> = {
    default: defaultResponse(),
  };
  if (hasPermissions) {
    responses["403"] = forbiddenResponse();
  }
  return responses;
}

function idParameter(): ParameterObject {
  return {
    name: "id",
    in: "path",
    required: true,
    description: "The record's id.",
    schema: { type: "string" },
  };
}

/**
 * Query parameters supported by collection, search, and relationship-picker
 * routes: offset pagination, single-field sorting, and `filter[field][op]`
 * comparisons.
 *
 * Cursor pagination and multi-field sorting are not supported.
 */
function listParameters(
  fields: Record<string, FieldSchema>,
  defaultPageSize: number,
): ParameterObject[] {
  const sortableNames = Object.entries(fields)
    .filter(([, field]) => field.sortable === true)
    .map(([name]) => name);

  const filterableProperties = Object.fromEntries(
    Object.entries(fields)
      .filter(([, field]) => field.filterable === true)
      .map(([name, field]) => [name, fieldToJsonSchema(field)]),
  );

  const parameters: ParameterObject[] = [
    {
      name: "page",
      in: "query",
      description: "1-based page number.",
      schema: { type: "integer", default: 1 },
    },
    {
      name: "pageSize",
      in: "query",
      description: "Records per page, up to 100.",
      schema: { type: "integer", default: defaultPageSize, maximum: 100 },
    },
    {
      name: "search",
      in: "query",
      description: "Free-text search across searchable fields.",
      schema: { type: "string" },
    },
  ];

  if (sortableNames.length > 0) {
    parameters.push(
      {
        name: "sort",
        in: "query",
        description: "Field to sort by.",
        schema: { type: "string", enum: sortableNames },
      },
      {
        name: "order",
        in: "query",
        description: "Sort direction.",
        schema: { type: "string", enum: ["asc", "desc"] },
      },
    );
  }

  if (Object.keys(filterableProperties).length > 0) {
    parameters.push({
      name: "filter",
      in: "query",
      style: "deepObject",
      explode: true,
      description:
        "Per-field filters. Each property accepts a direct equality value, or an object keyed by comparison operator (eq, gte, gt, lte, lt), e.g. filter[price][gte]=10.",
      schema: { type: "object", properties: filterableProperties },
    });
  }

  return parameters;
}

function listResponses(
  hasPermissions: boolean,
  itemsRef: OpenApiSchema,
): Record<string, ResponseObject> {
  return {
    "200": jsonResponse("A page of records.", {
      type: "object",
      properties: {
        data: { type: "array", items: itemsRef },
        meta: {
          type: "object",
          properties: {
            total: { type: "integer" },
            page: { type: "integer" },
            pageSize: { type: "integer" },
          },
          required: ["total", "page", "pageSize"],
        },
      },
      required: ["data", "meta"],
    }),
    ...baseResponses(hasPermissions),
  };
}

function listOperation(
  operationId: string,
  fields: Record<string, FieldSchema>,
  defaultPageSize: number,
  hasPermissions: boolean,
  responseSchemaRef: OpenApiSchema,
): OperationObject {
  return {
    operationId,
    parameters: listParameters(fields, defaultPageSize),
    responses: listResponses(hasPermissions, responseSchemaRef),
  };
}

function createOperation(
  operationId: string,
  hasPermissions: boolean,
  createRef: OpenApiSchema,
  responseRef: OpenApiSchema,
): OperationObject {
  return {
    operationId,
    requestBody: {
      required: true,
      content: { "application/json": { schema: createRef } },
    },
    responses: {
      "201": jsonResponse("The created record.", {
        type: "object",
        properties: { data: responseRef },
        required: ["data"],
      }),
      ...baseResponses(hasPermissions),
    },
  };
}

function findOperation(
  operationId: string,
  hasPermissions: boolean,
  responseRef: OpenApiSchema,
): OperationObject {
  return {
    operationId,
    parameters: [idParameter()],
    responses: {
      "200": jsonResponse("The requested record.", {
        type: "object",
        properties: { data: responseRef },
        required: ["data"],
      }),
      "404": notFoundResponse(),
      ...baseResponses(hasPermissions),
    },
  };
}

function updateOperation(
  operationId: string,
  hasPermissions: boolean,
  updateRef: OpenApiSchema,
  responseRef: OpenApiSchema,
): OperationObject {
  return {
    operationId,
    parameters: [idParameter()],
    requestBody: {
      required: true,
      content: { "application/json": { schema: updateRef } },
    },
    responses: {
      "200": jsonResponse("The updated record.", {
        type: "object",
        properties: { data: responseRef },
        required: ["data"],
      }),
      "404": notFoundResponse(),
      ...baseResponses(hasPermissions),
    },
  };
}

function deleteOperation(
  operationId: string,
  hasPermissions: boolean,
): OperationObject {
  return {
    operationId,
    parameters: [idParameter()],
    responses: {
      "204": { description: "The record was deleted." },
      "404": notFoundResponse(),
      ...baseResponses(hasPermissions),
    },
  };
}

function actionOperation(
  operationId: string,
  hasPermissions: boolean,
  inputRef: OpenApiSchema | undefined,
): OperationObject {
  return {
    operationId,
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              input: inputRef ?? { type: "object" },
              confirmed: {
                type: "boolean",
                description:
                  "Acknowledges the action's confirmation prompt, if any.",
              },
              recordId: {
                type: "string",
                description:
                  "The record this action applies to, for row-scoped actions.",
              },
            },
          },
        },
      },
    },
    responses: {
      "200": jsonResponse("The action ran successfully.", {
        type: "object",
        properties: {
          // Action result types aren't available at runtime, so the response schema
          // is intentionally unconstrained rather than inferred.
          data: {
            description:
              "The action's result. Shape is action-specific and not statically declared.",
          },
          message: { type: "string" },
        },
        required: ["data"],
      }),
      "404": notFoundResponse(),
      ...baseResponses(hasPermissions),
    },
  };
}

function uploadOperation(
  operationId: string,
  hasPermissions: boolean,
): OperationObject {
  return {
    operationId,
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: { file: { type: "string", format: "binary" } },
            required: ["file"],
          },
        },
      },
    },
    responses: {
      "201": jsonResponse("The stored file.", {
        type: "object",
        properties: { data: { $ref: "#/components/schemas/StoredFile" } },
        required: ["data"],
      }),
      ...baseResponses(hasPermissions),
    },
  };
}

/**
 * Builds the OpenAPI paths for a resource: CRUD, search, configured actions,
 * file/image uploads when storage is configured, and `belongsTo`
 * relationship pickers.
 *
 * `hasMany` and `belongsToMany` relationships do not expose picker routes.
 * `resourceBase` is relative to `servers[].url`; the caller has already
 * removed `basePath`.
 */
export function resourcePaths<TActor>(
  entry: RouteTableEntry<TActor>,
  resourceBase: string,
  options: {
    hasStorage: boolean;
    entriesByResourceName: ReadonlyMap<string, RouteTableEntry<TActor>>;
  },
): Record<string, PathItemObject> {
  const { config, fields } = entry;
  const resourceName = config.resource.name;
  const hasPermissions = config.permissions !== "open";
  const resourceSchema = config.resource.toSchema();

  const createRef: OpenApiSchema = {
    $ref: `#/components/schemas/${resourceName}Create`,
  };
  const updateRef: OpenApiSchema = {
    $ref: `#/components/schemas/${resourceName}Update`,
  };
  const responseRef: OpenApiSchema = {
    $ref: `#/components/schemas/${resourceName}`,
  };

  const paths: Record<string, PathItemObject> = {
    [resourceBase]: {
      get: listOperation(
        `list_${resourceName}`,
        fields,
        25,
        hasPermissions,
        responseRef,
      ),
      post: createOperation(
        `create_${resourceName}`,
        hasPermissions,
        createRef,
        responseRef,
      ),
    },
    [`${resourceBase}/search`]: {
      get: listOperation(
        `search_${resourceName}`,
        fields,
        10,
        hasPermissions,
        responseRef,
      ),
    },
    [`${resourceBase}/{id}`]: {
      get: findOperation(`find_${resourceName}`, hasPermissions, responseRef),
      patch: updateOperation(
        `update_${resourceName}`,
        hasPermissions,
        updateRef,
        responseRef,
      ),
      delete: deleteOperation(`delete_${resourceName}`, hasPermissions),
    },
  };

  for (const action of config.actions ?? []) {
    const actionSchema = action.toSchema();
    const inputRef: OpenApiSchema | undefined = actionSchema.form
      ? {
          $ref: `#/components/schemas/${resourceName}${capitalize(action.name)}Input`,
        }
      : undefined;

    paths[`${resourceBase}/actions/${action.name}`] = {
      post: actionOperation(
        `run_${resourceName}_${action.name}`,
        hasPermissions,
        inputRef,
      ),
    };
  }

  if (options.hasStorage) {
    for (const [fieldName, field] of Object.entries(fields)) {
      if (field.fieldType === "file" || field.fieldType === "image") {
        paths[`${resourceBase}/uploads/${fieldName}`] = {
          post: uploadOperation(
            `upload_${resourceName}_${fieldName}`,
            hasPermissions,
          ),
        };
      }
    }
  }

  for (const [relationshipName, relationship] of Object.entries(
    resourceSchema.relationships,
  )) {
    if (relationship.relationshipType !== "belongsTo") {
      continue;
    }

    // Relationship pickers delegate to the target resource's list handler,
    // so their query parameters and item schema are derived from the target.
    const targetEntry = options.entriesByResourceName.get(
      relationship.resource,
    );
    const targetFields = targetEntry?.fields ?? {};

    paths[`${resourceBase}/relationships/${relationshipName}`] = {
      get: listOperation(
        `list_${resourceName}_relationships_${relationshipName}`,
        targetFields,
        25,
        hasPermissions,
        { $ref: `#/components/schemas/${relationship.resource}` },
      ),
    };
  }

  return paths;
}

function capitalize(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}
