import assert from "node:assert/strict";
import test from "node:test";
import type { FieldSchema } from "@verikit/core";
import { h } from "vue";
import { RenderField } from "../../src/fields/registry.js";
import { TextField } from "../../src/fields/inputs.js";
import { asVNode } from "../support/vnode.js";

function field(patch: Partial<FieldSchema>): FieldSchema {
  return { type: "field", name: "title", fieldType: "text", ...patch };
}

test("render field uses registry overrides", () => {
  const CustomField = () => h("span", {}, "Custom");
  const rendered = RenderField({
    field: field({ fieldType: "text" }),
    registry: { text: CustomField },
  });

  assert.equal(asVNode(rendered).type, CustomField);
});

test("render field falls back to the default registry", () => {
  const rendered = RenderField({ field: field({ fieldType: "text" }) });

  assert.equal(asVNode(rendered).type, TextField);
});

test("render field renders nothing for a hidden field, regardless of value", () => {
  // `resolveResourceSchema` marks a field `hidden` both for schema-authored hidden
  // fields and for fields the actor lacks read access to. Either way the label and
  // current value must never reach the DOM  a merely `disabled` input would still leak them.
  const rendered = RenderField({
    field: field({ fieldType: "text", hidden: true, label: "Salary" }),
    value: "confidential",
  });

  assert.equal(rendered, null);
});

test("render field renders nothing for a formHidden field, same as a fully hidden one", () => {
  const rendered = RenderField({
    field: field({ fieldType: "text", formHidden: true, label: "Internal ID" }),
    value: "abc-123",
  });

  assert.equal(rendered, null);
});

test("render field renders normally for a tableHidden field (tableHidden only affects table columns)", () => {
  const rendered = RenderField({
    field: field({ fieldType: "text", tableHidden: true, label: "Notes" }),
    value: "visible in the form",
  });

  assert.notEqual(rendered, null);
});
