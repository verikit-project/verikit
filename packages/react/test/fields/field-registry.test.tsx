import assert from "node:assert/strict";
import test from "node:test";
import type { FieldSchema } from "@verikit/core";
import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BooleanField,
  DateField,
  DateTimeField,
  EmailField,
  FieldShell,
  FileField,
  ImageField,
  NumberField,
  RenderField,
  SelectField,
  TextareaField,
  TextField,
  fieldAriaProps,
  fieldId,
} from "../../src/fields/index.js";

type AnyElement = ReactElement<Record<string, unknown>>;

function field(patch: Partial<FieldSchema>): FieldSchema {
  return {
    type: "field",
    name: "title",
    fieldType: "text",
    ...patch,
  };
}

function asElement(value: unknown): AnyElement {
  assert.equal(isValidElement(value), true);

  return value as AnyElement;
}

function invoke(element: AnyElement): AnyElement {
  assert.equal(typeof element.type, "function");
  const component = element.type as (props: Record<string, unknown>) => unknown;

  return asElement(component(element.props));
}

function childrenOf(element: AnyElement): unknown[] {
  return Array.isArray(element.props.children)
    ? element.props.children
    : [element.props.children];
}

function fieldControl(element: AnyElement): AnyElement {
  const shellOrOutput = invoke(element);
  const output =
    typeof shellOrOutput.type === "function"
      ? invoke(shellOrOutput)
      : shellOrOutput;
  const [, control] = childrenOf(output);

  return asElement(control);
}

test("field shell renders labels, descriptions, errors, and aria metadata", () => {
  const schema = field({
    description: "Visible in forms.",
    label: "Title",
    required: true,
  });
  const shell = (
    <FieldShell field={schema} id="title" error="Required" className="gap-3">
      <input />
    </FieldShell>
  );
  const html = renderToStaticMarkup(shell);

  assert.match(html, /Title/);
  assert.match(html, /Visible in forms\./);
  assert.match(html, /Required/);
  assert.deepEqual(fieldAriaProps(schema, "title", "Required"), {
    "aria-describedby": "title-description title-error",
    "aria-invalid": true,
    "aria-required": true,
  });
  assert.deepEqual(fieldAriaProps(field({}), "title"), {
    "aria-describedby": undefined,
    "aria-invalid": undefined,
    "aria-required": undefined,
  });
  assert.equal(fieldId(schema), "verikit-field-title");
  assert.equal(fieldId(schema, "custom-id"), "custom-id");
});

test("input-backed fields render values, constraints, and change handlers", () => {
  const changes: unknown[] = [];
  const schema = field({
    description: "Short title",
    fieldType: "text",
    label: "Title",
    maxLength: 12,
    minLength: 2,
    placeholder: "Untitled",
    required: true,
  } as Partial<FieldSchema>);
  const control = fieldControl(
    asElement(
      TextField({
        field: schema,
        inputClassName: "tracking-wide",
        onBlur: () => changes.push("blur"),
        onValueChange: (value) => changes.push(value),
        value: new Date("2026-07-25T12:30:00.000Z"),
      }),
    ),
  );

  assert.equal(control.props.value, "2026-07-25T12:30:00.000Z");
  assert.equal(control.props.minLength, 2);
  assert.equal(control.props.maxLength, 12);
  assert.equal(control.props.required, true);
  assert.equal(control.props.placeholder, "Untitled");
  (control.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "Ready" },
  });
  (control.props.onBlur as () => void)();
  assert.deepEqual(changes, ["Ready", "blur"]);

  const emailControl = fieldControl(
    asElement(
      EmailField({ field: field({ fieldType: "email" }), value: null }),
    ),
  );
  assert.equal(emailControl.props.type, "email");
  assert.equal(emailControl.props.value, "");

  const numberChanges: unknown[] = [];
  const numberControl = fieldControl(
    asElement(
      NumberField({
        field: field({
          fieldType: "number",
          hidden: true,
          max: 10,
          min: 1,
          step: 0.5,
        } as Partial<FieldSchema>),
        onValueChange: (value) => numberChanges.push(value),
        readOnly: true,
        value: 4,
      }),
    ),
  );
  assert.equal(numberControl.props.disabled, true);
  assert.equal(numberControl.props.readOnly, true);
  assert.equal(numberControl.props.min, 1);
  assert.equal(numberControl.props.max, 10);
  assert.equal(numberControl.props.step, 0.5);
  (numberControl.props.onChange as (event: unknown) => void)({
    currentTarget: { valueAsNumber: 7 },
  });
  assert.deepEqual(numberChanges, [7]);
});

test("textarea and date fields render specialized input shapes", () => {
  const textareaControl = fieldControl(
    asElement(
      TextareaField({
        disabled: true,
        field: field({
          fieldType: "textarea",
          maxLength: 30,
          minLength: 3,
          readOnly: true,
        } as Partial<FieldSchema>),
        onValueChange: (value) => assert.equal(value, "Updated"),
        value: "Notes",
      }),
    ),
  );
  assert.equal(textareaControl.props.value, "Notes");
  assert.equal(textareaControl.props.disabled, true);
  assert.equal(textareaControl.props.readOnly, true);
  assert.equal(textareaControl.props.minLength, 3);
  assert.equal(textareaControl.props.maxLength, 30);
  (textareaControl.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "Updated" },
  });

  const dateControl = fieldControl(
    asElement(
      DateField({
        field: field({ fieldType: "date" }),
        value: "2026-07-25T12:30:00.000Z",
      }),
    ),
  );
  assert.equal(dateControl.props.type, "date");
  assert.equal(dateControl.props.value, "2026-07-25");

  const invalidDateControl = fieldControl(
    asElement(
      DateTimeField({
        field: field({ fieldType: "datetime" }),
        value: "not-a-date",
      }),
    ),
  );
  assert.equal(invalidDateControl.props.type, "datetime-local");
  assert.equal(invalidDateControl.props.value, "not-a-date");

  const emptyDateControl = fieldControl(
    asElement(DateField({ field: field({ fieldType: "date" }), value: "" })),
  );
  assert.equal(emptyDateControl.props.value, "");
});

test("select field maps string values back to option values", () => {
  const changes: unknown[] = [];
  const blurs: unknown[] = [];
  const shell = asElement(
    SelectField({
      field: field({
        fieldType: "select",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: 1 },
        ],
        placeholder: "Pick status",
      }),
      inputClassName: "w-72",
      onBlur: () => blurs.push("blur"),
      onValueChange: (value) => changes.push(value),
      readOnly: true,
      value: 1,
    }),
  );
  const output = invoke(shell);
  const select = asElement(childrenOf(output)[1]);

  assert.equal(select.props.value, "1");
  assert.equal(select.props.readOnly, true);
  (select.props.onValueChange as (value: string | null) => void)("1");
  (select.props.onValueChange as (value: string | null) => void)("missing");
  (select.props.onValueChange as (value: string | null) => void)(null);
  assert.deepEqual(changes, [1, "missing", null]);

  const trigger = asElement(childrenOf(select)[0]);
  assert.match(String(trigger.props.className), /w-72/);
  (trigger.props.onBlur as () => void)();
  assert.deepEqual(blurs, ["blur"]);
});

test("select field disables interaction when the field itself is read-only", () => {
  const shell = asElement(
    SelectField({
      field: field({
        fieldType: "select",
        options: [{ label: "Draft", value: "draft" }],
        readOnly: true,
      }),
      value: "draft",
    }),
  );
  const select = asElement(childrenOf(invoke(shell))[1]);

  assert.equal(select.props.readOnly, true);
});

test("boolean and upload fields wire shadcn controls", () => {
  const booleanChanges: unknown[] = [];
  const checkbox = asElement(
    childrenOf(
      asElement(
        childrenOf(
          invoke(
            asElement(
              BooleanField({
                field: field({ fieldType: "boolean", readOnly: true }),
                inputClassName: "self-start",
                onValueChange: (value) => booleanChanges.push(value),
                value: true,
              }),
            ),
          ),
        )[1],
      ),
    )[0],
  );
  assert.equal(checkbox.props.checked, true);
  assert.equal(checkbox.props.disabled, true);
  (checkbox.props.onCheckedChange as (value: boolean) => void)(false);
  assert.deepEqual(booleanChanges, [false]);

  const uploadChanges: unknown[] = [];
  const uploadShell = invoke(
    asElement(
      FileField({
        field: field({
          accept: [".pdf", 42],
          fieldType: "file",
          multiple: true,
        } as Partial<FieldSchema>),
        onValueChange: (value) => uploadChanges.push(value),
      }),
    ),
  );
  const uploadGroup = asElement(childrenOf(invoke(uploadShell))[1]);
  const uploadInput = asElement(childrenOf(uploadGroup)[0]);
  const files = { length: 1 };
  assert.equal(uploadInput.props.type, "file");
  assert.equal(uploadInput.props.accept, ".pdf");
  assert.equal(uploadInput.props.multiple, true);
  (uploadInput.props.onChange as (event: unknown) => void)({
    currentTarget: { files },
  });
  (uploadInput.props.onChange as (event: unknown) => void)({
    currentTarget: { files: null },
  });
  assert.deepEqual(uploadChanges, [files]);

  const imageShell = invoke(
    asElement(
      ImageField({
        disabled: true,
        field: field({ fieldType: "image" }),
        readOnly: true,
      }),
    ),
  );
  const imageInput = asElement(
    childrenOf(asElement(childrenOf(invoke(imageShell))[1]))[0],
  );
  assert.equal(imageInput.props.accept, "image/*");
  assert.equal(imageInput.props.disabled, true);
});

test("render field uses registry overrides", () => {
  const CustomField = () => <span>Custom</span>;
  const rendered = RenderField({
    field: field({ fieldType: "text" }),
    registry: { text: CustomField },
  });
  const html = renderToStaticMarkup(rendered);

  assert.equal(html, "<span>Custom</span>");
});

test("render field renders nothing for a hidden field, regardless of value", () => {
  // `resolveResourceSchema` marks a field `hidden` both for schema-authored
  // hidden fields and for fields the actor lacks read access to. Either way
  // the label and current value must never reach the DOM  a merely
  // `disabled` input would still leak them.
  const rendered = RenderField({
    field: field({ fieldType: "text", hidden: true, label: "Salary" }),
    value: "confidential",
  });

  assert.equal(rendered, null);
});

test("shadcn primitives render through field components", () => {
  const html = renderToStaticMarkup(
    <>
      <TextField field={field({ fieldType: "text", label: "Title" })} />
      <TextareaField field={field({ fieldType: "textarea" })} />
      <BooleanField field={field({ fieldType: "boolean" })} />
      <FileField field={field({ fieldType: "file" })} />
    </>,
  );

  assert.match(html, /data-slot="input"/);
  assert.match(html, /data-slot="textarea"/);
  assert.match(html, /data-slot="checkbox"/);
});

test("field components cover fallback branches", () => {
  const unnamedChanges: unknown[] = [];
  const textControl = fieldControl(
    asElement(
      TextField({
        field: field({ fieldType: "text" }),
        name: "custom_name",
        value: undefined,
      }),
    ),
  );
  assert.equal(textControl.props.name, "custom_name");
  assert.equal(textControl.props.value, "");
  (textControl.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "Ignored" },
  });
  assert.deepEqual(unnamedChanges, []);

  const validDateTime = fieldControl(
    asElement(
      DateTimeField({
        field: field({ fieldType: "datetime" }),
        value: new Date("2026-07-25T12:30:00.000Z"),
      }),
    ),
  );
  assert.equal(validDateTime.props.value, "2026-07-25T12:30");

  const selectOutput = invoke(
    asElement(
      SelectField({
        field: field({ fieldType: "select" }),
      }),
    ),
  );
  const select = asElement(childrenOf(selectOutput)[1]);
  const selectTrigger = asElement(childrenOf(select)[0]);
  const selectValue = asElement(childrenOf(selectTrigger)[0]);
  assert.equal(select.props.value, "");
  assert.equal(selectValue.props.placeholder, "Select...");

  const checkbox = asElement(
    childrenOf(
      asElement(
        childrenOf(
          invoke(
            asElement(BooleanField({ field: field({ fieldType: "boolean" }) })),
          ),
        )[1],
      ),
    )[0],
  );
  assert.equal(checkbox.props.checked, false);
  assert.equal(checkbox.props.disabled, false);
  (checkbox.props.onCheckedChange as (value: boolean) => void)(true);

  const uploadShell = invoke(
    asElement(
      FileField({
        field: field({ fieldType: "file" }),
        readOnly: true,
      }),
    ),
  );
  const uploadInput = asElement(
    childrenOf(asElement(childrenOf(invoke(uploadShell))[1]))[0],
  );
  assert.equal(uploadInput.props.accept, undefined);
  assert.equal(uploadInput.props.disabled, true);
});
