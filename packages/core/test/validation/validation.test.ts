import assert from "node:assert/strict";
import test from "node:test";
import {
  boolean,
  date,
  email,
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

test("default values are still checked against field constraints", () => {
  const schema = text().default("No").min(3).toSchema("name");

  assert.deepEqual(validateField(schema, undefined), {
    success: false,
    issues: [{ path: [], message: "Must be at least 3 characters." }],
  });
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
