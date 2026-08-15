import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, email, text } from "@verikit/core";
import {
  resolveVerikitFields,
  type VerikitFormFields,
} from "../../src/index.js";

const fields: VerikitFormFields = {
  email: email().required().toSchema("email"),
  name: text().required().toSchema("name"),
};

test("resolveVerikitFields accepts maps, resource schemas, and resources", () => {
  const resource = defineResource("User", {
    fields: {
      email: email().required(),
      name: text().required(),
    },
  });
  const schema = resource.toSchema();

  assert.equal(resolveVerikitFields(fields), fields);
  assert.deepEqual(Object.keys(resolveVerikitFields(schema)), [
    "email",
    "name",
  ]);
  assert.deepEqual(Object.keys(resolveVerikitFields(resource)), [
    "email",
    "name",
  ]);
});
