import type { JsonSchemaValue } from "@verikit/core";

const VALIDATION_ISSUE_SCHEMA: JsonSchemaValue = {
  type: "object",
  properties: {
    path: {
      type: "array",
      items: { type: ["string", "number"] },
    },
    message: { type: "string" },
  },
  required: ["path", "message"],
};

const STORED_FILE_SCHEMA: JsonSchemaValue = {
  type: "object",
  properties: {
    url: { type: "string" },
    key: { type: "string" },
    name: { type: "string" },
    type: { type: "string" },
    size: { type: "number" },
  },
  required: ["url", "name", "type", "size"],
};

function errorEnvelope(
  codeSchema: JsonSchemaValue,
  extraProperties: Record<string, JsonSchemaValue> = {},
): JsonSchemaValue {
  return {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: codeSchema,
          message: { type: "string" },
          ...extraProperties,
        },
        required: ["code", "message"],
      },
    },
    required: ["error"],
  };
}

/**
 * Reusable `components.schemas` entries for VeriKit's structured error
 * responses.
 *
 * Mirrors the HTTP error envelope `{ error: { code, message, ...details } }`.
 * `Error` provides a permissive fallback for errors without a dedicated
 * response schema.
 */
export function errorComponentSchemas(): Record<string, JsonSchemaValue> {
  return {
    ValidationIssue: VALIDATION_ISSUE_SCHEMA,
    StoredFile: STORED_FILE_SCHEMA,
    Error: errorEnvelope({ type: "string" }),
    ValidationError: errorEnvelope(
      { type: "string", enum: ["VALIDATION_ERROR"] },
      { issues: { type: "array", items: VALIDATION_ISSUE_SCHEMA } },
    ),
    ForbiddenError: errorEnvelope({ type: "string", enum: ["FORBIDDEN"] }),
    NotFoundError: errorEnvelope({ type: "string", enum: ["NOT_FOUND"] }),
    ConflictError: errorEnvelope({ type: "string", enum: ["CONFLICT"] }),
    UnauthorizedError: errorEnvelope({ type: "string", enum: ["UNAUTHORIZED"] }),
  };
}
