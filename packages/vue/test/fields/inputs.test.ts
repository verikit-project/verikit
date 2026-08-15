import assert from "node:assert/strict";
import test from "node:test";
import type { FieldSchema } from "@verikit/core";
import {
  BooleanField,
  DateField,
  DateTimeField,
  EmailField,
  FileField,
  ImageField,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from "../../src/fields/inputs.js";
import { asVNode, childrenOf, renderComponent } from "../support/vnode.js";

function field(patch: Partial<FieldSchema>): FieldSchema {
  return { type: "field", name: "title", fieldType: "text", ...patch };
}

function fieldControl(component: Parameters<typeof renderComponent>[0], props: Record<string, unknown>) {
  return asVNode(childrenOf(renderComponent(component, props))[0]);
}

test("input-backed fields render values, constraints, and change/blur handlers", () => {
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
  const control = fieldControl(TextField, {
    field: schema,
    inputClassName: "tracking-wide",
    onBlur: () => changes.push("blur"),
    onValueChange: (value: unknown) => changes.push(value),
    value: new Date("2026-07-25T12:30:00.000Z"),
  });

  assert.equal(control.props?.value, "2026-07-25T12:30:00.000Z");
  assert.equal(control.props?.minLength, 2);
  assert.equal(control.props?.maxLength, 12);
  assert.equal(control.props?.required, true);
  assert.equal(control.props?.placeholder, "Untitled");
  (control.props?.onInput as (event: unknown) => void)({ target: { value: "Ready" } });
  (control.props?.onBlur as () => void)();
  assert.deepEqual(changes, ["Ready", "blur"]);

  const emailControl = fieldControl(EmailField, {
    field: field({ fieldType: "email" }),
    value: null,
  });
  assert.equal(emailControl.props?.type, "email");
  assert.equal(emailControl.props?.value, "");

  const numberChanges: unknown[] = [];
  const numberControl = fieldControl(NumberField, {
    field: field({
      fieldType: "number",
      hidden: true,
      max: 10,
      min: 1,
      step: 0.5,
    } as Partial<FieldSchema>),
    onValueChange: (value: unknown) => numberChanges.push(value),
    readOnly: true,
    value: 4,
  });
  assert.equal(numberControl.props?.disabled, true);
  assert.equal(numberControl.props?.readonly, true);
  assert.equal(numberControl.props?.min, 1);
  assert.equal(numberControl.props?.max, 10);
  assert.equal(numberControl.props?.step, 0.5);
  (numberControl.props?.onInput as (event: unknown) => void)({
    target: { valueAsNumber: 7 },
  });
  assert.deepEqual(numberChanges, [7]);
});

test("textarea and date fields render specialized input shapes", () => {
  const textareaControl = fieldControl(TextareaField, {
    disabled: true,
    field: field({
      fieldType: "textarea",
      maxLength: 30,
      minLength: 3,
      readOnly: true,
    } as Partial<FieldSchema>),
    onValueChange: (value: unknown) => assert.equal(value, "Updated"),
    value: "Notes",
  });
  assert.equal(textareaControl.props?.value, "Notes");
  assert.equal(textareaControl.props?.disabled, true);
  assert.equal(textareaControl.props?.readonly, true);
  assert.equal(textareaControl.props?.minLength, 3);
  assert.equal(textareaControl.props?.maxLength, 30);
  (textareaControl.props?.onInput as (event: unknown) => void)({
    target: { value: "Updated" },
  });

  const dateControl = fieldControl(DateField, {
    field: field({ fieldType: "date" }),
    value: "2026-07-25T12:30:00.000Z",
  });
  assert.equal(dateControl.props?.type, "date");
  assert.equal(dateControl.props?.value, "2026-07-25");

  const invalidDateControl = fieldControl(DateTimeField, {
    field: field({ fieldType: "datetime" }),
    value: "not-a-date",
  });
  assert.equal(invalidDateControl.props?.type, "datetime-local");
  assert.equal(invalidDateControl.props?.value, "not-a-date");

  const emptyDateControl = fieldControl(DateField, {
    field: field({ fieldType: "date" }),
    value: "",
  });
  assert.equal(emptyDateControl.props?.value, "");
});

test("select field maps string values back to option values", () => {
  const changes: unknown[] = [];
  const blurs: unknown[] = [];
  const select = fieldControl(SelectField, {
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
    onValueChange: (value: unknown) => changes.push(value),
    readOnly: true,
    value: 1,
  });

  assert.equal(select.props?.value, "1");
  const onValueChange = select.props?.onValueChange as (value: string | null) => void;
  onValueChange("1");
  onValueChange("missing");
  onValueChange(null);
  assert.deepEqual(changes, [1, "missing", null]);

  const [trigger] = childrenOf(select);
  const triggerVNode = asVNode(trigger);
  assert.match(String(triggerVNode.props?.class), /w-72/);
  (triggerVNode.props?.onBlur as () => void)();
  assert.deepEqual(blurs, ["blur"]);
});

test("select field disables interaction when the field itself is disabled", () => {
  const select = fieldControl(SelectField, {
    field: field({
      fieldType: "select",
      hidden: true,
      options: [{ label: "Draft", value: "draft" }],
    }),
    value: "draft",
  });

  assert.equal(select.props?.disabled, true);
});

test("boolean and upload fields wire the Reka UI-backed controls", () => {
  const booleanChanges: unknown[] = [];
  const booleanWrapper = fieldControl(BooleanField, {
    field: field({ fieldType: "boolean", readOnly: true }),
    inputClassName: "self-start",
    onValueChange: (value: unknown) => booleanChanges.push(value),
    value: true,
  });
  const checkbox = asVNode(childrenOf(booleanWrapper)[0]);
  assert.equal(checkbox.props?.checked, true);
  assert.equal(checkbox.props?.disabled, true);
  (checkbox.props?.onCheckedChange as (value: boolean) => void)(false);
  assert.deepEqual(booleanChanges, [false]);

  const uploadChanges: unknown[] = [];
  const uploadWrapper = fieldControl(FileField, {
    field: field({
      accept: [".pdf", 42],
      fieldType: "file",
      multiple: true,
    } as Partial<FieldSchema>),
    onValueChange: (value: unknown) => uploadChanges.push(value),
  });
  const [uploadInputNode] = childrenOf(uploadWrapper);
  const uploadInput = asVNode(uploadInputNode);
  const files = { length: 1 };
  assert.equal(uploadInput.props?.type, "file");
  assert.equal(uploadInput.props?.accept, ".pdf");
  assert.equal(uploadInput.props?.multiple, true);
  (uploadInput.props?.onChange as (event: unknown) => void)({ target: { files } });
  (uploadInput.props?.onChange as (event: unknown) => void)({ target: { files: null } });
  assert.deepEqual(uploadChanges, [files]);

  const imageWrapper = fieldControl(ImageField, {
    disabled: true,
    field: field({ fieldType: "image" }),
    readOnly: true,
  });
  const imageInput = asVNode(childrenOf(imageWrapper)[0]);
  assert.equal(imageInput.props?.accept, "image/*");
  assert.equal(imageInput.props?.disabled, true);
});

test("field components cover fallback branches", () => {
  const unnamedChanges: unknown[] = [];
  const textControl = fieldControl(TextField, {
    field: field({ fieldType: "text" }),
    name: "custom_name",
    value: undefined,
  });
  assert.equal(textControl.props?.name, "custom_name");
  assert.equal(textControl.props?.value, "");
  (textControl.props?.onInput as (event: unknown) => void)({ target: { value: "Ignored" } });
  assert.deepEqual(unnamedChanges, []);

  const validDateTime = fieldControl(DateTimeField, {
    field: field({ fieldType: "datetime" }),
    value: new Date("2026-07-25T12:30:00.000Z"),
  });
  assert.equal(validDateTime.props?.value, "2026-07-25T12:30");

  const select = fieldControl(SelectField, { field: field({ fieldType: "select" }) });
  const [triggerNode] = childrenOf(select);
  const trigger = asVNode(triggerNode);
  const [valueNode] = childrenOf(trigger);
  assert.equal(select.props?.value, "");
  assert.equal(asVNode(valueNode).props?.placeholder, "Select...");

  const booleanWrapper = fieldControl(BooleanField, { field: field({ fieldType: "boolean" }) });
  const checkbox = asVNode(childrenOf(booleanWrapper)[0]);
  assert.equal(checkbox.props?.checked, false);
  assert.equal(checkbox.props?.disabled, false);

  const uploadWrapper = fieldControl(FileField, {
    field: field({ fieldType: "file" }),
    readOnly: true,
  });
  const uploadInput = asVNode(childrenOf(uploadWrapper)[0]);
  assert.equal(uploadInput.props?.accept, undefined);
  assert.equal(uploadInput.props?.disabled, true);
});
