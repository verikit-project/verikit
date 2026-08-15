import assert from "node:assert/strict";
import test from "node:test";
import { email, text, number } from "@verikit/core";
import { action } from "@verikit/runtime";
import {
  firstFieldError,
  firstFieldErrors,
  inferAndValidateResource,
  omitFieldError,
  submitVerikitActionForm,
  submitVerikitResourceForm,
  validationIssuesToFieldErrors,
  type VerikitFormFields,
} from "../../src/index.js";

const fields: VerikitFormFields = {
  email: email().required().toSchema("email"),
  name: text().required().toSchema("name"),
  seats: number().required().toSchema("seats"),
};

test("validation issues map to field errors", () => {
  const errors = validationIssuesToFieldErrors([
    { path: ["email"], message: "Invalid email" },
    { path: ["email", "domain"], message: "Blocked domain" },
    { path: [0], message: "Indexed issue" },
    { path: [], message: "Form issue" },
  ]);

  assert.deepEqual(errors, {
    "0": ["Indexed issue"],
    $form: ["Form issue"],
    email: ["Invalid email", "Blocked domain"],
  });
  assert.equal(firstFieldError(errors, "email"), "Invalid email");
  assert.equal(firstFieldError(errors, "missing"), undefined);
  assert.deepEqual(firstFieldErrors(errors), {
    "0": "Indexed issue",
    $form: "Form issue",
    email: "Invalid email",
  });
  assert.deepEqual(firstFieldErrors({}), {});
  assert.deepEqual(omitFieldError(errors, "email"), {
    "0": ["Indexed issue"],
    $form: ["Form issue"],
  });
  assert.deepEqual(omitFieldError({}, "email"), {});
});

test("resource submission infers, validates, maps errors, and calls onSubmit", async () => {
  const inference = await submitVerikitResourceForm({
    fields,
    values: { email: "person@example.com", name: "Ada", seats: "nope" },
  });
  assert.equal(inference.success, false);
  assert.equal(inference.reason, "inference");
  assert.deepEqual(Object.keys(inference.fieldErrors), ["seats"]);

  const validation = await submitVerikitResourceForm({
    fields,
    values: { email: "not-email", name: "Ada", seats: "2" },
  });
  assert.equal(validation.success, false);
  assert.equal(validation.reason, "validation");
  assert.deepEqual(Object.keys(validation.fieldErrors), ["email"]);

  const submitted: unknown[] = [];
  const success = await submitVerikitResourceForm({
    fields,
    values: { email: "person@example.com", name: "Ada", seats: "2" },
    onSubmit: (values) => {
      submitted.push(values);
      return "ok";
    },
  });
  assert.equal(success.success, true);
  assert.equal(success.result, "ok");
  assert.deepEqual(success.value, {
    email: "person@example.com",
    name: "Ada",
    seats: 2,
  });
  assert.deepEqual(submitted, [success.value]);

  const validated = await inferAndValidateResource(fields, {
    email: "person@example.com",
    name: "Ada",
    seats: "3",
  });
  assert.deepEqual(validated, {
    success: true,
    value: { email: "person@example.com", name: "Ada", seats: 3 },
  });

  const invalidInference = await inferAndValidateResource(fields, {
    email: "person@example.com",
    name: "Ada",
    seats: "nope",
  });
  assert.equal(invalidInference.success, false);
});

test("submitVerikitResourceForm and inferAndValidateResource drop a readOnly field's value, even when required", async () => {
  const fieldsWithReadOnly: VerikitFormFields = {
    ...fields,
    id: text().required().readOnly().toSchema("id"),
  };

  const submitted: unknown[] = [];
  const success = await submitVerikitResourceForm({
    fields: fieldsWithReadOnly,
    // "id" has no value at all here it's required, but readOnly, so it must
    // never block submission on a value that will never actually be sent.
    values: { email: "person@example.com", name: "Ada", seats: "2" },
    onSubmit: (values) => {
      submitted.push(values);
      return "ok";
    },
  });

  assert.equal(success.success, true);
  assert.deepEqual(success.value, {
    email: "person@example.com",
    name: "Ada",
    seats: 2,
  });
  assert.deepEqual(submitted, [success.value]);

  // A client-supplied value for a readOnly field is dropped, not merely ignored
  // when absent.
  const withClientValue = await submitVerikitResourceForm({
    fields: fieldsWithReadOnly,
    values: {
      email: "person@example.com",
      name: "Ada",
      seats: "2",
      id: "client-supplied",
    },
  });
  assert.equal(withClientValue.success, true);
  assert.equal(withClientValue.value.id, undefined);

  const validated = await inferAndValidateResource(fieldsWithReadOnly, {
    email: "person@example.com",
    name: "Ada",
    seats: "3",
  });
  assert.deepEqual(validated, {
    success: true,
    value: { email: "person@example.com", name: "Ada", seats: 3 },
  });
});

test("submitVerikitResourceForm and inferAndValidateResource drop a formHidden field's value, even when required", async () => {
  const fieldsWithFormHidden: VerikitFormFields = {
    ...fields,
    internalNote: text().required().formHidden().toSchema("internalNote"),
  };

  const submitted: unknown[] = [];
  const success = await submitVerikitResourceForm({
    fields: fieldsWithFormHidden,
    // "internalNote" is required but formHidden, so it never appears in the
    // form and must not block a submission that will never include it.
    values: { email: "person@example.com", name: "Ada", seats: "2" },
    onSubmit: (values) => {
      submitted.push(values);
      return "ok";
    },
  });

  assert.equal(success.success, true);
  assert.deepEqual(success.value, {
    email: "person@example.com",
    name: "Ada",
    seats: 2,
  });
  assert.deepEqual(submitted, [success.value]);

  const validated = await inferAndValidateResource(fieldsWithFormHidden, {
    email: "person@example.com",
    name: "Ada",
    seats: "3",
  });
  assert.deepEqual(validated, {
    success: true,
    value: { email: "person@example.com", name: "Ada", seats: 3 },
  });
});

test("action submission infers action form input before runAction", async () => {
  const publish = action("publish")
    .form({
      note: text().required(),
      priority: number().required(),
    })
    .execute(({ input }) => `${input.note}:${input.priority}`);

  const inference = await submitVerikitActionForm({
    action: publish,
    request: { context: {} },
    values: { note: "Ready", priority: "nope" },
  });
  assert.equal(inference.success, false);
  assert.equal(inference.reason, "inference");
  assert.deepEqual(Object.keys(inference.fieldErrors), ["priority"]);

  const validation = await submitVerikitActionForm({
    action: publish,
    request: { context: {} },
    values: { note: "", priority: "2" },
  });
  assert.equal(validation.success, false);
  assert.equal(validation.reason, "validation");
  assert.deepEqual(Object.keys(validation.fieldErrors), ["note"]);

  const success = await submitVerikitActionForm({
    action: publish,
    request: { context: {} },
    values: { note: "Ready", priority: "2" },
  });
  assert.equal(success.success, true);
  assert.equal(success.result, "Ready:2");

  const noForm = await submitVerikitActionForm({
    action: action("ping").execute(() => "pong"),
    request: { context: {} },
    values: { ignored: true },
  });
  assert.equal(noForm.success, true);
  assert.equal(noForm.result, "pong");
  assert.deepEqual(noForm.fieldErrors, {});
});
