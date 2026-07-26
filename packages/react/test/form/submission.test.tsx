import assert from "node:assert/strict";
import test from "node:test";
import { email, text, number, defineResource } from "@verikit/core";
import { action } from "@verikit/runtime";
import { renderToStaticMarkup } from "react-dom/server";
import {
  firstFieldError,
  firstFieldErrors,
  inferAndValidateResource,
  resolveVerikitFields,
  submitVerikitActionForm,
  submitVerikitResourceForm,
  submitVerikitSchemaTreeActionForm,
  useVerikitForm,
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

test("schema tree action submission extracts nested action input values", async () => {
  const publish = action("publish")
    .form({
      note: text().required(),
      priority: number().required(),
    })
    .execute(({ input }) => `${input.note}:${input.priority}`);

  const success = await submitVerikitSchemaTreeActionForm({
    action: publish,
    request: { context: {} },
    values: { publish: { note: "Ready", priority: "2" } },
  });
  assert.equal(success.success, true);
  assert.equal(success.result, "Ready:2");

  const validation = await submitVerikitSchemaTreeActionForm({
    action: publish,
    request: { context: {} },
    values: { modal: { note: "", priority: "2" } },
    path: ["modal"],
  });
  assert.equal(validation.success, false);
  assert.equal(validation.reason, "validation");
  assert.deepEqual(Object.keys(validation.fieldErrors), ["note"]);

  const missingPath = await submitVerikitSchemaTreeActionForm({
    action: publish,
    request: { context: {} },
    values: {},
  });
  assert.equal(missingPath.success, false);
  assert.equal(missingPath.reason, "validation");
  assert.deepEqual(Object.keys(missingPath.fieldErrors).sort(), [
    "note",
    "priority",
  ]);
});

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

test("useVerikitForm exposes TanStack form state and field props", async () => {
  let captured: ReturnType<typeof useVerikitForm<string>> | undefined;
  const submittedValues: unknown[] = [];

  function Probe() {
    const form = useVerikitForm({
      fields,
      defaultValues: {
        email: "person@example.com",
        name: "Ada",
        seats: 2,
      },
      onSubmit: (values) => {
        submittedValues.push(values);
        return "saved";
      },
    });
    const props = form.getFieldProps("email");
    captured = form;

    assert.equal(form.getFieldError("email"), undefined);
    assert.equal(props.name, "email");
    assert.equal(props.value, "person@example.com");
    assert.throws(() => form.getFieldProps("missing"), /Unknown Verikit field/);

    return <span>{Object.keys(form.fields).join(",")}</span>;
  }

  assert.equal(
    renderToStaticMarkup(<Probe />),
    "<span>email,name,seats</span>",
  );

  assert.ok(captured);
  const props = captured.getFieldProps("email");
  props.onBlur?.();
  props.onValueChange?.("new@example.com");
  captured.setFieldErrors({ email: ["Already used"] });
  captured.clearFieldErrors();
  assert.notEqual(captured.validate, captured.submit);
  const validated = await captured.validate({
    email: "person@example.com",
    name: "Ada",
    seats: "2",
  });
  assert.equal(validated.success, true);
  assert.deepEqual(submittedValues, []);
  const submitted = await captured.submit({
    email: "person@example.com",
    name: "Ada",
    seats: "2",
  });
  assert.equal(submitted.success, true);
  assert.equal(submitted.result, "saved");
  assert.equal(submittedValues.length, 1);
  await captured.form.options.onSubmit?.({
    formApi: captured.form,
    meta: undefined as never,
    value: {
      email: "person@example.com",
      name: "Ada",
      seats: "2",
    },
  });
});
