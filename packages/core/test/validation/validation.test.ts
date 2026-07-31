import assert from "node:assert/strict";
import test from "node:test";
import {
  boolean,
  date,
  datetime,
  email,
  FieldSchema,
  file,
  image,
  number,
  select,
  text,
} from "../../src/fields/index.js";
import { defineResource } from "../../src/resource/index.js";
import {
  validateField,
  validateFieldAsync,
  validateResource,
  validateResourceAsync,
} from "../../src/validation/index.js";

test("required and nullable are enforced for missing/null values", () => {
  const required = text().required().toSchema("name");
  const nullable = text().nullable().toSchema("name");
  const optional = text().optional().toSchema("name");

  assert.deepEqual(validateField(required, undefined), {
    success: false,
    issues: [{ path: [], message: "This field is required." }],
  });
  assert.deepEqual(validateField(required, null), {
    success: false,
    issues: [{ path: [], message: "This field cannot be null." }],
  });
  assert.deepEqual(validateField(nullable, null), {
    success: true,
    value: null,
  });
  assert.deepEqual(validateField(optional, undefined), {
    success: true,
    value: undefined,
  });
});

test("missing values fall back to the field default before validation", () => {
  const schema = text().default("Anonymous").min(3).toSchema("name");

  assert.deepEqual(validateField(schema, undefined), {
    success: true,
    value: "Anonymous",
  });
});

test("provided values take precedence over field defaults", () => {
  const schema = text().default("Anonymous").toSchema("name");

  assert.deepEqual(validateField(schema, "Ada"), {
    success: true,
    value: "Ada",
  });
});

test("default values are checked against field constraints when declared", () => {
  assert.throws(
    () => text().default("No").min(3),
    /Default value does not satisfy field constraints: Must be at least 3 characters\./,
  );
});

test("text/textarea/email enforce string type and length constraints", () => {
  const schema = text().min(2).max(4).toSchema("code");

  assert.equal(validateField(schema, 5).success, false);
  assert.equal(validateField(schema, "a").success, false);
  assert.equal(validateField(schema, "abcde").success, false);
  assert.deepEqual(validateField(schema, "abc"), {
    success: true,
    value: "abc",
  });
});

test("email fields additionally validate address format", () => {
  const schema = email().required().toSchema("email");

  assert.equal(validateField(schema, "not-an-email").success, false);
  assert.deepEqual(validateField(schema, "ada@example.com"), {
    success: true,
    value: "ada@example.com",
  });
});

test("number fields validate type, range, and step", () => {
  const schema = number().min(0).max(10).step(2).toSchema("count");

  assert.equal(validateField(schema, "3").success, false);
  assert.equal(validateField(schema, -1).success, false);
  assert.equal(validateField(schema, 11).success, false);
  assert.equal(validateField(schema, 3).success, false);
  assert.deepEqual(validateField(schema, 4), { success: true, value: 4 });
});

test("number step validation uses zero as the default base without a minimum", () => {
  const schema = number().step(2).toSchema("count");

  assert.deepEqual(validateField(schema, 4), { success: true, value: 4 });
  assert.equal(validateField(schema, 3).success, false);
});

test("number fields reject non-finite numbers before range/step checks", () => {
  const schema = number().toSchema("count");

  assert.deepEqual(validateField(schema, Number.NaN), {
    success: false,
    issues: [{ path: [], message: "Must be a finite number." }],
  });
  assert.deepEqual(validateField(schema, Number.POSITIVE_INFINITY), {
    success: false,
    issues: [{ path: [], message: "Must be a finite number." }],
  });
});

test("boolean fields require an actual boolean", () => {
  const schema = boolean().toSchema("active");

  assert.equal(validateField(schema, "true").success, false);
  assert.deepEqual(validateField(schema, true), { success: true, value: true });
});

test("date fields accept Date instances and parseable strings", () => {
  const schema = date().toSchema("birthday");

  assert.equal(validateField(schema, "not-a-date").success, false);
  assert.equal(validateField(schema, 0).success, false);
  assert.equal(validateField(schema, true).success, false);
  assert.deepEqual(validateField(schema, "2020-01-01"), {
    success: true,
    value: "2020-01-01",
  });
  const parsed = new Date("2020-01-01");
  assert.deepEqual(validateField(schema, parsed), {
    success: true,
    value: parsed,
  });
});

test("date fields enforce min/max range constraints", () => {
  const schema = date().min("2020-01-01").max("2020-12-31").toSchema("startsOn");

  assert.equal(validateField(schema, "2019-12-31").success, false);
  assert.equal(validateField(schema, "2021-01-01").success, false);
  assert.deepEqual(validateField(schema, "2020-06-15"), {
    success: true,
    value: "2020-06-15",
  });
});

test("datetime fields enforce min/max range constraints against Date instances", () => {
  const schema = datetime()
    .min(new Date("2020-01-01T00:00:00.000Z"))
    .max(new Date("2020-01-02T00:00:00.000Z"))
    .toSchema("publishedAt");

  assert.equal(
    validateField(schema, new Date("2019-12-31T23:59:59.000Z")).success,
    false,
  );
  assert.equal(
    validateField(schema, new Date("2020-01-02T00:00:01.000Z")).success,
    false,
  );

  const within = new Date("2020-01-01T12:00:00.000Z");
  assert.deepEqual(validateField(schema, within), {
    success: true,
    value: within,
  });
});

test("unrecognized field types skip type-specific checks", () => {
  const schema: FieldSchema = {
    type: "field",
    name: "custom",
    fieldType: "custom" as FieldSchema["fieldType"],
  };

  assert.deepEqual(validateField(schema, "anything"), {
    success: true,
    value: "anything",
  });
});

test("select fields restrict values to configured options", () => {
  const schema = select<string>()
    .options(["siamese", "tabby"])
    .toSchema("breed");

  assert.equal(validateField(schema, "persian").success, false);
  assert.deepEqual(validateField(schema, "tabby"), {
    success: true,
    value: "tabby",
  });
});

test("select fields without configured options fail validation", () => {
  const schema = select<string>().toSchema("breed");

  assert.deepEqual(validateField(schema, "anything"), {
    success: false,
    issues: [
      {
        path: [],
        message: "Select fields must define at least one option.",
      },
    ],
  });
});

test("file fields accept stored references and validate upload metadata when present", () => {
  const single = file().accept(["application/pdf"]).maxSize(10).toSchema("doc");
  const multiple = image().maxSize(10).multiple().toSchema("gallery");

  assert.deepEqual(validateField(single, "uploads/report.pdf"), {
    success: true,
    value: "uploads/report.pdf",
  });
  assert.equal(validateField(single, { unknown: true }).success, false);
  assert.equal(validateField(single, { size: 5 }).success, false); // missing accepted type
  assert.equal(
    validateField(single, { size: 20, type: "application/pdf" }).success,
    false,
  ); // too big
  assert.deepEqual(
    validateField(single, { size: 5, type: "application/pdf" }),
    {
      success: true,
      value: { size: 5, type: "application/pdf" },
    },
  );

  assert.equal(
    validateField(multiple, { size: 5, type: "image/png" }).success,
    false,
  ); // not an array
  const result = validateField(multiple, [
    "uploads/cat.png",
    { size: 20, type: "image/png" },
  ]);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.issues[0]?.path, [1]);
  }
});

test("file fields accept extension-based accept patterns", () => {
  const schema = file().accept([".csv"]).toSchema("doc");

  assert.deepEqual(validateField(schema, { name: "data.csv", size: 10 }), {
    success: true,
    value: { name: "data.csv", size: 10 },
  });
  assert.equal(
    validateField(schema, { name: "data.txt", size: 10 }).success,
    false,
  );
});

test("file accept patterns reject uploads missing comparison metadata", () => {
  const wildcardSchema = file().accept(["image/*"]).toSchema("image");
  const extensionSchema = file().accept([".csv"]).toSchema("doc");
  const emptyAcceptSchema = file().accept([]).toSchema("any");

  assert.equal(validateField(wildcardSchema, { size: 10 }).success, false);
  assert.equal(
    validateField(wildcardSchema, { size: 10, type: "text/plain" }).success,
    false,
  );
  assert.equal(extensionSchema.fieldType, "file");
  assert.equal(validateField(extensionSchema, { size: 10 }).success, false);
  assert.deepEqual(validateField(emptyAcceptSchema, { size: 10 }), {
    success: true,
    value: { size: 10 },
  });
});

test("attached validation runs after built-in checks and can transform the value", () => {
  const schema = text()
    .validation({ parse: (value: unknown) => String(value).trim() })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "  ada  "), {
    success: true,
    value: "ada",
  });
});

test("attached validation failures surface as issues", () => {
  const schema = text()
    .validation({
      parse: () => {
        throw new Error("must be unique");
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [{ path: [], message: "must be unique" }],
  });
});

test("sync validation rejects promise-like parse validators", () => {
  const schema = text()
    .validation({
      parse: () => Promise.resolve("ada"),
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [
      {
        path: [],
        message:
          "Async validators are not supported by validateField(); use validateFieldAsync() instead.",
      },
    ],
  });
});

test("sync validation rejects promise-like standard schema validators", () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => Promise.resolve({ value: "ada" }),
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [
      {
        path: [],
        message:
          "Async validators are not supported by validateField(); use validateFieldAsync() instead.",
      },
    ],
  });
});

test("attached validation non-error throws surface as issues", () => {
  const schema = text()
    .validation({
      parse: () => {
        throw "must be unique";
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [{ path: [], message: "must be unique" }],
  });
});

test("a validator with neither parse nor ~standard leaves the value unchanged", () => {
  const schema = text().validation({}).toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: true,
    value: "ada",
  });
});

test("standard schema issue paths drop segments that are not strings, numbers, or {key}", () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [
            {
              message: "broken path",
              path: [{ notKey: true }, "field"],
            },
          ],
        }),
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [{ path: ["field"], message: "broken path" }],
  });
});

test("standard schema issue paths include string and number key objects", () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [
            {
              message: "key path",
              path: [{ key: "items" }, { key: 0 }],
            },
          ],
        }),
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [{ path: ["items", 0], message: "key path" }],
  });
});

test("standard schema issue paths drop key objects whose key is not string or number", () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [
            {
              message: "broken key",
              path: [{ key: Symbol("field") }],
            },
          ],
        }),
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [{ path: [], message: "broken key" }],
  });
});

test("standard schema issues without paths default to an empty issue path", () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [{ message: "missing path" }],
        }),
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [{ path: [], message: "missing path" }],
  });
});

test("standard schema issue paths preserve numeric segments and numeric key objects", () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [
            {
              message: "indexed path",
              path: [0, { key: 1 }],
            },
          ],
        }),
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [{ path: [0, 1], message: "indexed path" }],
  });
});

test("standard schema validators unwrap values and issues", () => {
  const passing = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value: unknown) => ({ value: String(value).trim() }),
      },
    })
    .toSchema("name");
  const failing = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [
            {
              message: "must be lowercase",
              path: [{ key: "name" }],
            },
          ],
        }),
      },
    })
    .toSchema("name");

  assert.deepEqual(validateField(passing, "  Ada  "), {
    success: true,
    value: "Ada",
  });
  assert.deepEqual(validateField(failing, "Ada"), {
    success: false,
    issues: [{ path: ["name"], message: "must be lowercase" }],
  });
});

test("validateField rejects promise-returning ~standard validators synchronously", () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value: unknown) => ({ value: String(value) }),
      },
    })
    .toSchema("name");

  assert.equal(validateField(schema, "ada").success, false);
});

test("validateField rejects promise-returning parse validators synchronously", () => {
  const schema = text()
    .validation({ parse: async (value: unknown) => String(value) })
    .toSchema("name");

  assert.deepEqual(validateField(schema, "ada"), {
    success: false,
    issues: [
      {
        path: [],
        message:
          "Async validators are not supported by validateField(); use validateFieldAsync() instead.",
      },
    ],
  });
});

test("validateField safely rejects rejecting async parse validators synchronously", async () => {
  const schema = text()
    .validation({
      parse: async () => {
        throw new Error("async parse failed");
      },
    })
    .toSchema("name");

  assert.equal(validateField(schema, "ada").success, false);
  await Promise.resolve();
});

test("validateField safely rejects rejecting async standard validators synchronously", async () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async () => {
          throw new Error("async standard failed");
        },
      },
    })
    .toSchema("name");

  assert.equal(validateField(schema, "ada").success, false);
  await Promise.resolve();
});

test("validateFieldAsync awaits async ~standard validators", async () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value: unknown) => ({
          value: String(value).toUpperCase(),
        }),
      },
    })
    .toSchema("name");

  assert.deepEqual(await validateFieldAsync(schema, "ada"), {
    success: true,
    value: "ADA",
  });
});

test("validateFieldAsync unwraps async standard schema issues", async () => {
  const schema = text()
    .validation({
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async () => ({
          issues: [{ message: "not available", path: ["slug"] }],
        }),
      },
    })
    .toSchema("slug");

  assert.deepEqual(await validateFieldAsync(schema, "taken"), {
    success: false,
    issues: [{ path: ["slug"], message: "not available" }],
  });
});

test("validateFieldAsync short-circuits on failed built-in checks without invoking the validator", async () => {
  const schema = text()
    .required()
    .validation({
      parse: assert.fail,
    })
    .toSchema("name");

  assert.deepEqual(await validateFieldAsync(schema, undefined), {
    success: false,
    issues: [{ path: [], message: "This field is required." }],
  });
});

test("validateFieldAsync passes through fields with no attached validator", async () => {
  const schema = text().toSchema("name");

  assert.deepEqual(await validateFieldAsync(schema, "Ada"), {
    success: true,
    value: "Ada",
  });
});

test("validateFieldAsync awaits async parse-style validators", async () => {
  const schema = text()
    .validation({ parse: async (value: unknown) => String(value).trim() })
    .toSchema("name");

  assert.deepEqual(await validateFieldAsync(schema, "  ada  "), {
    success: true,
    value: "ada",
  });
});

test("validateFieldAsync leaves the value unchanged for a validator with neither parse nor ~standard", async () => {
  const schema = text().validation({}).toSchema("name");

  assert.deepEqual(await validateFieldAsync(schema, "ada"), {
    success: true,
    value: "ada",
  });
});

test("validateFieldAsync catches rejected parse-style validators as issues", async () => {
  const schema = text()
    .validation({
      parse: async () => {
        throw new Error("must be unique");
      },
    })
    .toSchema("name");

  assert.deepEqual(await validateFieldAsync(schema, "ada"), {
    success: false,
    issues: [{ path: [], message: "must be unique" }],
  });
});

test("validateResource aggregates per-field issues prefixed with field name", () => {
  const resource = defineResource("user", {
    fields: {
      name: text().required(),
      age: number().min(0),
    },
  });
  const { fields } = resource.toSchema();

  const result = validateResource(fields, { name: undefined, age: -1 });

  assert.deepEqual(result, {
    success: false,
    issues: [
      { path: ["name"], message: "This field is required." },
      { path: ["age"], message: "Must be at least 0." },
    ],
  });
});

test("validateResource returns the validated value map on success", () => {
  const resource = defineResource("user", {
    fields: {
      name: text().required(),
      age: number().min(0).optional(),
    },
  });
  const { fields } = resource.toSchema();

  assert.deepEqual(validateResource(fields, { name: "Ada", age: undefined }), {
    success: true,
    value: { name: "Ada", age: undefined },
  });
});

test("validateResource omits absent optional fields from the validated value map", () => {
  const resource = defineResource("user", {
    fields: {
      name: text().required(),
      age: number().optional(),
    },
  });
  const { fields } = resource.toSchema();

  assert.deepEqual(validateResource(fields, { name: "Ada" }), {
    success: true,
    value: { name: "Ada" },
  });
});

test("validateResource includes defaults for absent fields", () => {
  const resource = defineResource("user", {
    fields: {
      name: text().default("Anonymous"),
    },
  });
  const { fields } = resource.toSchema();

  assert.deepEqual(validateResource(fields, {}), {
    success: true,
    value: { name: "Anonymous" },
  });
});

test("validateResourceAsync supports async validators across fields", async () => {
  const resource = defineResource("user", {
    fields: {
      name: text().validation({
        "~standard": {
          version: 1,
          vendor: "test",
          validate: async (value: unknown) => ({
            value: String(value).trim(),
          }),
        },
      }),
    },
  });
  const { fields } = resource.toSchema();

  assert.deepEqual(await validateResourceAsync(fields, { name: "  Ada  " }), {
    success: true,
    value: { name: "Ada" },
  });
});

test("validateResourceAsync omits absent optional fields from the validated value map", async () => {
  const resource = defineResource("user", {
    fields: {
      name: text().validation({
        "~standard": {
          version: 1,
          vendor: "test",
          validate: async (value: unknown) => ({
            value: String(value).trim(),
          }),
        },
      }),
      age: number().optional(),
    },
  });
  const { fields } = resource.toSchema();

  assert.deepEqual(await validateResourceAsync(fields, { name: "  Ada  " }), {
    success: true,
    value: { name: "Ada" },
  });
});

test("validateResourceAsync prefixes async standard schema issue paths", async () => {
  const resource = defineResource("user", {
    fields: {
      profile: text().validation({
        "~standard": {
          version: 1,
          vendor: "test",
          validate: async () => ({
            issues: [{ message: "invalid slug", path: ["slug"] }],
          }),
        },
      }),
    },
  });
  const { fields } = resource.toSchema();

  assert.deepEqual(await validateResourceAsync(fields, { profile: "bad" }), {
    success: false,
    issues: [{ path: ["profile", "slug"], message: "invalid slug" }],
  });
});
