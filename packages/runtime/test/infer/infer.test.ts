import assert from "node:assert/strict";
import test from "node:test";
import { boolean, date, number, select, text } from "@verikit/core";
import { inferField, inferResource } from "../../src/infer/index.js";

test("inferField passes through values that already match the field type", () => {
  assert.deepEqual(inferField(text().toSchema("name"), "Ada"), {
    success: true,
    value: "Ada",
  });
  assert.deepEqual(inferField(number().toSchema("count"), 4), {
    success: true,
    value: 4,
  });
  assert.deepEqual(inferField(boolean().toSchema("active"), true), {
    success: true,
    value: true,
  });
});

test("inferField treats a blank or whitespace-only string as no value", () => {
  const schema = text().required().toSchema("name");

  assert.deepEqual(inferField(schema, ""), { success: true, value: undefined });
  assert.deepEqual(inferField(schema, "   "), {
    success: true,
    value: undefined,
  });
});

test("inferField leaves null and undefined untouched for validateField to gate", () => {
  const schema = number().toSchema("count");

  assert.deepEqual(inferField(schema, undefined), {
    success: true,
    value: undefined,
  });
  assert.deepEqual(inferField(schema, null), { success: true, value: null });
});

test("inferField coerces numeric strings and rejects unparsable ones", () => {
  const schema = number().toSchema("count");

  assert.deepEqual(inferField(schema, "42"), { success: true, value: 42 });
  assert.deepEqual(inferField(schema, " 42 "), { success: true, value: 42 });
  assert.deepEqual(inferField(schema, "abc"), {
    success: false,
    issues: [{ path: [], message: "Cannot infer a number." }],
  });
  assert.deepEqual(inferField(schema, true), {
    success: false,
    issues: [{ path: [], message: "Cannot infer a number." }],
  });
  assert.deepEqual(inferField(schema, Number.NaN), {
    success: false,
    issues: [{ path: [], message: "Cannot infer a number." }],
  });
});

test("inferField coerces common boolean string and number shorthands", () => {
  const schema = boolean().toSchema("active");

  for (const truthy of ["true", "True", "1", "yes", "on"]) {
    assert.deepEqual(inferField(schema, truthy), {
      success: true,
      value: true,
    });
  }
  for (const falsy of ["false", "False", "0", "no", "off"]) {
    assert.deepEqual(inferField(schema, falsy), {
      success: true,
      value: false,
    });
  }
  assert.deepEqual(inferField(schema, 1), { success: true, value: true });
  assert.deepEqual(inferField(schema, 0), { success: true, value: false });
  assert.deepEqual(inferField(schema, "maybe"), {
    success: false,
    issues: [{ path: [], message: "Cannot infer a boolean." }],
  });
});

test("inferField parses date strings and rejects invalid ones", () => {
  const schema = date().toSchema("startsOn");

  assert.deepEqual(inferField(schema, "2026-07-23"), {
    success: true,
    value: new Date("2026-07-23"),
  });

  const existing = new Date("2026-01-01");
  assert.deepEqual(inferField(schema, existing), {
    success: true,
    value: existing,
  });

  assert.deepEqual(inferField(schema, "not-a-date"), {
    success: false,
    issues: [{ path: [], message: "Cannot infer a date." }],
  });
  assert.deepEqual(inferField(schema, new Date("not-a-date")), {
    success: false,
    issues: [{ path: [], message: "Cannot infer a date." }],
  });
});

test("inferField resolves select values by exact or stringified match against configured options", () => {
  const schema = select<number>()
    .options([
      { label: "Low", value: 1 },
      { label: "High", value: 2 },
    ])
    .toSchema("priority");

  assert.deepEqual(inferField(schema, 2), { success: true, value: 2 });
  assert.deepEqual(inferField(schema, "2"), { success: true, value: 2 });
  assert.deepEqual(inferField(schema, "3"), {
    success: false,
    issues: [
      {
        path: [],
        message: "Cannot infer a value from the configured options.",
      },
    ],
  });
});

test("inferField passes values through unchanged for select fields with no configured options", () => {
  const schema = select().toSchema("priority");

  assert.deepEqual(inferField(schema, "whatever"), {
    success: true,
    value: "whatever",
  });
});

test("inferField passes upload values through unchanged", () => {
  const schema = text().toSchema("avatar");
  const upload = { name: "a.png", type: "image/png", size: 10 };

  assert.deepEqual(inferField({ ...schema, fieldType: "image" }, upload), {
    success: true,
    value: upload,
  });
  assert.deepEqual(
    inferField({ ...schema, fieldType: "image" }, "stored/path.png"),
    { success: true, value: "stored/path.png" },
  );
});

test("inferResource coerces only the fields that would be validated", () => {
  const fields = {
    name: text().required().toSchema("name"),
    age: number().toSchema("age"),
    note: text().optional().toSchema("note"),
  };

  assert.deepEqual(inferResource(fields, { name: "Ada", age: "36" }), {
    success: true,
    value: { name: "Ada", age: 36 },
  });
});

test("inferResource prefixes coercion failures with the field name", () => {
  const fields = {
    age: number().required().toSchema("age"),
  };

  assert.deepEqual(inferResource(fields, { age: "not-a-number" }), {
    success: false,
    issues: [{ path: ["age"], message: "Cannot infer a number." }],
  });
});
