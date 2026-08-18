import assert from "node:assert/strict";
import test from "node:test";
import { fieldApplicability } from "../../src/fields/field-applicability.js";
import { text } from "../../src/fields/index.js";

test("a plain required field is applicable everywhere", () => {
  const schema = text().required().toSchema("name");

  assert.deepEqual(fieldApplicability(schema), {
    create: true,
    update: true,
    response: true,
  });
});

test("a readOnly field is excluded from create and update but present in response", () => {
  const schema = text().readOnly().toSchema("id");

  assert.deepEqual(fieldApplicability(schema), {
    create: false,
    update: false,
    response: true,
  });
});

test("a hidden field is excluded from response only", () => {
  const schema = text().hidden().toSchema("internalNote");

  assert.deepEqual(fieldApplicability(schema), {
    create: true,
    update: true,
    response: false,
  });
});

test("a readOnly and hidden field is excluded from every surface", () => {
  const schema = text().readOnly().hidden().toSchema("secret");

  assert.deepEqual(fieldApplicability(schema), {
    create: false,
    update: false,
    response: false,
  });
});
