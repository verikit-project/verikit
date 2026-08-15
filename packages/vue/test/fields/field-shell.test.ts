import assert from "node:assert/strict";
import test from "node:test";
import type { FieldSchema } from "@verikit/core";
import { h } from "vue";
import {
  FieldShell,
  fieldAriaProps,
  fieldId,
} from "../../src/fields/field-shell.js";
import { asVNode, childrenOf, renderComponent } from "../support/vnode.js";

function field(patch: Partial<FieldSchema>): FieldSchema {
  return { type: "field", name: "title", fieldType: "text", ...patch };
}

test("field shell renders label, required marker, description, and error", () => {
  const schema = field({
    description: "Visible in forms.",
    label: "Title",
    required: true,
  });
  const vnode = renderComponent(
    FieldShell,
    { field: schema, id: "title", error: "Required", className: "gap-3" },
    { slots: { default: () => h("input") } },
  );

  assert.match(String(vnode.props?.class), /gap-3/);
  const [labelNode, inputNode, descriptionNode, errorNode] = childrenOf(vnode);

  const label = asVNode(labelNode);
  assert.equal(label.props?.for, "title");
  const [labelText, requiredMark] = childrenOf(label);
  assert.equal(labelText, "Title");
  assert.equal(asVNode(requiredMark).props?.["aria-hidden"], "true");

  assert.equal(asVNode(inputNode).type, "input");

  const description = asVNode(descriptionNode);
  assert.equal(description.props?.id, "title-description");
  assert.equal(childrenOf(description)[0], "Visible in forms.");

  const error = asVNode(errorNode);
  assert.equal(error.props?.id, "title-error");
  assert.equal(childrenOf(error)[0], "Required");
});

test("field shell renders a label without a required marker when the field isn't required", () => {
  const vnode = renderComponent(
    FieldShell,
    { field: field({ label: "Title", required: false }), id: "title" },
    { slots: { default: () => h("input") } },
  );
  const [labelNode] = childrenOf(vnode);
  const [, requiredMark] = childrenOf(asVNode(labelNode));

  assert.equal(requiredMark, null);
});

test("field shell renders nothing extra without a label, description, or error", () => {
  const vnode = renderComponent(
    FieldShell,
    { field: field({}), id: "title" },
    { slots: { default: () => h("input") } },
  );
  const children = childrenOf(vnode);

  assert.equal(children[0], null);
  assert.equal(asVNode(children[1]).type, "input");
  assert.equal(children[2], null);
  assert.equal(children[3], null);
});

test("fieldAriaProps builds describedby/invalid/required, and omits unset ones", () => {
  const schema = field({ description: "Visible in forms.", required: true });

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
});

test("fieldId returns the explicit id or derives one from the field name", () => {
  assert.equal(fieldId(field({})), "verikit-field-title");
  assert.equal(fieldId(field({}), "custom-id"), "custom-id");
});
