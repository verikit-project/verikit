import assert from "node:assert/strict";
import test from "node:test";
import { errorComponentSchemas } from "../../src/openapi/error-schemas.js";

test("errorComponentSchemas produces every reusable error/shared schema", () => {
  const schemas = errorComponentSchemas();

  assert.deepEqual(Object.keys(schemas).sort(), [
    "ConflictError",
    "Error",
    "ForbiddenError",
    "NotFoundError",
    "StoredFile",
    "UnauthorizedError",
    "ValidationError",
    "ValidationIssue",
  ]);
});

test("each named error schema fixes its code to the matching VerikitErrorCode", () => {
  const schemas = errorComponentSchemas();

  assert.deepEqual(
    (
      schemas.ForbiddenError!.properties!.error as {
        properties: Record<string, unknown>;
      }
    ).properties.code,
    { type: "string", enum: ["FORBIDDEN"] },
  );
  assert.deepEqual(
    (
      schemas.NotFoundError!.properties!.error as {
        properties: Record<string, unknown>;
      }
    ).properties.code,
    { type: "string", enum: ["NOT_FOUND"] },
  );
  assert.deepEqual(
    (
      schemas.ConflictError!.properties!.error as {
        properties: Record<string, unknown>;
      }
    ).properties.code,
    { type: "string", enum: ["CONFLICT"] },
  );
  assert.deepEqual(
    (
      schemas.UnauthorizedError!.properties!.error as {
        properties: Record<string, unknown>;
      }
    ).properties.code,
    { type: "string", enum: ["UNAUTHORIZED"] },
  );
});

test("the generic Error schema leaves code unconstrained, for ad hoc VerikitErrors", () => {
  const schemas = errorComponentSchemas();
  const errorProperty = schemas.Error!.properties!.error as {
    properties: Record<string, unknown>;
  };

  assert.deepEqual(errorProperty.properties.code, { type: "string" });
});

test("ValidationError's issues array matches the ValidationIssue shape", () => {
  const schemas = errorComponentSchemas();
  const errorProperty = schemas.ValidationError!.properties!.error as {
    properties: { issues: { items: unknown } };
  };

  assert.deepEqual(
    errorProperty.properties.issues.items,
    schemas.ValidationIssue,
  );
});

test("StoredFile matches packages/server/src/storage.ts's StoredFile shape", () => {
  const schemas = errorComponentSchemas();

  assert.deepEqual(schemas.StoredFile, {
    type: "object",
    properties: {
      url: { type: "string" },
      key: { type: "string" },
      name: { type: "string" },
      type: { type: "string" },
      size: { type: "number" },
    },
    required: ["url", "name", "type", "size"],
  });
});
