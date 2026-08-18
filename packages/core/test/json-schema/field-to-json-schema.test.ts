import assert from "node:assert/strict";
import test from "node:test";
import { fieldToJsonSchema } from "../../src/json-schema/field-to-json-schema.js";
import {
  boolean,
  date,
  datetime,
  email,
  file,
  image,
  number,
  select,
  text,
  type FieldSchema,
} from "../../src/fields/index.js";

test("text field maps to a string schema with length constraints", () => {
  const schema = text().min(2).max(10).toSchema("name");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "string",
    minLength: 2,
    maxLength: 10,
  });
});

test("email field maps to a string schema with email format", () => {
  const schema = email().toSchema("email");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "string",
    format: "email",
  });
});

test("number field maps min/max/step to minimum/maximum/multipleOf", () => {
  const schema = number().min(0).max(100).step(5).toSchema("price");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "number",
    minimum: 0,
    maximum: 100,
    multipleOf: 5,
  });
});

test("boolean field maps to a boolean schema", () => {
  const schema = boolean().toSchema("active");

  assert.deepEqual(fieldToJsonSchema(schema), { type: "boolean" });
});

test("date field maps to a date-formatted string with vendor range extensions", () => {
  const schema = date()
    .min("2024-01-01")
    .max("2024-12-31")
    .toSchema("startDate");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "string",
    format: "date",
    "x-minimum": "2024-01-01",
    "x-maximum": "2024-12-31",
  });
});

test("datetime field maps to a date-time-formatted string", () => {
  const schema = datetime().toSchema("publishedAt");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "string",
    format: "date-time",
  });
});

test("select field maps its option values to an enum, without a type", () => {
  const schema = select().options(["draft", "published"]).toSchema("status");

  assert.deepEqual(fieldToJsonSchema(schema), {
    enum: ["draft", "published"],
  });
});

test("file field maps to a single string reference by default", () => {
  const schema = file()
    .accept(["application/pdf"])
    .maxSize(1024)
    .toSchema("attachment");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "string",
    "x-accept": ["application/pdf"],
    "x-maxSize": 1024,
  });
});

test("file field with multiple() maps to an array of string references", () => {
  const schema = file().multiple().toSchema("attachments");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "array",
    items: { type: "string" },
  });
});

test("image field maps like file, defaulting to image/* accept", () => {
  const schema = image().toSchema("cover");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: "string",
    "x-accept": ["image/*"],
  });
});

test("nullable widens type to include null", () => {
  const schema = text().nullable().toSchema("nickname");

  assert.deepEqual(fieldToJsonSchema(schema), {
    type: ["string", "null"],
  });
});

test("nullable on a select field appends null to enum instead of widening type", () => {
  const schema = select().options(["a", "b"]).nullable().toSchema("choice");

  assert.deepEqual(fieldToJsonSchema(schema), {
    enum: ["a", "b", null],
  });
});

test("default value and description pass through unchanged", () => {
  const schema = text()
    .default("N/A")
    .description("Internal note")
    .toSchema("note");

  const result = fieldToJsonSchema(schema);
  assert.equal(result.default, "N/A");
  assert.equal(result.description, "Internal note");
});

test("unique fields are flagged via x-unique, not enforced structurally", () => {
  const schema = text().unique().toSchema("slug");

  assert.equal(fieldToJsonSchema(schema)["x-unique"], true);
});

test("a field with attached validation is flagged without leaking the validator", () => {
  const schema = text()
    .validation({ parse: (value: unknown) => String(value).trim() })
    .toSchema("name");

  const result = fieldToJsonSchema(schema);
  assert.equal(result["x-hasCustomValidation"], true);

  const roundTripped = JSON.parse(JSON.stringify(result));
  assert.deepEqual(roundTripped, result);
});

test("an unrecognized custom field type maps to an unconstrained schema", () => {
  const customSchema: FieldSchema = {
    type: "field",
    name: "body",
    fieldType: "richText" as FieldSchema["fieldType"],
  };

  assert.deepEqual(fieldToJsonSchema(customSchema), {});
});
