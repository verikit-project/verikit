import assert from "node:assert/strict";
import test from "node:test";
import { fieldsToJsonSchema } from "../../src/json-schema/fields-to-json-schema.js";
import { datetime, text } from "../../src/fields/index.js";

function productFields() {
  return {
    id: text().readOnly().toSchema("id"),
    name: text().required().toSchema("name"),
    createdAt: datetime().readOnly().toSchema("createdAt"),
  };
}

test("create schema excludes readOnly fields and requires only required ones", () => {
  const schema = fieldsToJsonSchema(productFields(), { operation: "create" });

  assert.deepEqual(Object.keys(schema.properties), ["name"]);
  assert.deepEqual(schema.required, ["name"]);
  assert.equal(schema.additionalProperties, false);
});

test("update schema has the same field set as create but nothing required", () => {
  const schema = fieldsToJsonSchema(productFields(), { operation: "update" });

  assert.deepEqual(Object.keys(schema.properties), ["name"]);
  assert.equal(schema.required, undefined);
  assert.equal(schema.additionalProperties, false);
});

test("response schema includes every non-hidden field, all required", () => {
  const schema = fieldsToJsonSchema(productFields(), {
    operation: "response",
  });

  assert.deepEqual(Object.keys(schema.properties), ["id", "name", "createdAt"]);
  assert.deepEqual(schema.required, ["id", "name", "createdAt"]);
});

test("a hidden field is excluded from response but present in create/update", () => {
  const fields = {
    internalNote: text().hidden().toSchema("internalNote"),
  };

  assert.deepEqual(
    Object.keys(fieldsToJsonSchema(fields, { operation: "create" }).properties),
    ["internalNote"],
  );
  assert.deepEqual(
    Object.keys(fieldsToJsonSchema(fields, { operation: "update" }).properties),
    ["internalNote"],
  );
  assert.deepEqual(
    Object.keys(
      fieldsToJsonSchema(fields, { operation: "response" }).properties,
    ),
    [],
  );
});
