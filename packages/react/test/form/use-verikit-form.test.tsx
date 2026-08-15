import assert from "node:assert/strict";
import test from "node:test";
import { email, text, number } from "@verikit/core";
import { renderToStaticMarkup } from "react-dom/server";
import { useVerikitForm, type VerikitFormFields } from "../../src/index.js";

const fields: VerikitFormFields = {
  email: email().required().toSchema("email"),
  name: text().required().toSchema("name"),
  seats: number().required().toSchema("seats"),
};

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
