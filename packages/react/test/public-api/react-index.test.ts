import assert from "node:assert/strict";
import test from "node:test";
import type { ReactNode } from "../../src/index.js";

test("react package exposes its public entrypoint", async () => {
  const module = await import("../../src/index.js");
  const node: ReactNode = "Verikit";

  assert.deepEqual(Object.keys(module).sort(), [
    "BooleanField",
    "DateField",
    "DateTimeField",
    "EmailField",
    "FileField",
    "ImageField",
    "NumberField",
    "RenderField",
    "SelectField",
    "TextField",
    "TextareaField",
    "cn",
    "defaultFieldRegistry",
    "getFieldComponent",
  ]);
  assert.equal(
    module.cn("text-sm", false, ["font-medium"]),
    "text-sm font-medium",
  );
  assert.equal(node, "Verikit");
});

test("default field registry maps every core field type to a component", async () => {
  const { defaultFieldRegistry, getFieldComponent } =
    await import("../../src/index.js");
  const fieldTypes = [
    "text",
    "textarea",
    "email",
    "number",
    "select",
    "boolean",
    "date",
    "datetime",
    "file",
    "image",
  ] as const;

  assert.deepEqual(Object.keys(defaultFieldRegistry), fieldTypes);

  for (const fieldType of fieldTypes) {
    assert.equal(typeof defaultFieldRegistry[fieldType], "function");
    assert.equal(getFieldComponent(fieldType), defaultFieldRegistry[fieldType]);
  }
});
