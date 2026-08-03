import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { defineResource, text } from "@verikit/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { installJsdom } from "../dom-setup.js";
import {
  useVerikitSchemaTreeForm,
  type UseVerikitSchemaTreeFormResult,
} from "../../src/index.js";

const resource = defineResource("contact", {
  fields: {
    email: text().required(),
    name: text().required(),
  },
});

let uninstallJsdom: () => void;
let container: HTMLDivElement;
let root: Root;

before(() => {
  uninstallJsdom = installJsdom();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

after(() => {
  act(() => {
    root.unmount();
  });
  uninstallJsdom();
});

test("two onFieldChange calls in the same tick each clear their own field's error, not just the last one", () => {
  let captured: UseVerikitSchemaTreeFormResult | undefined;

  function Probe() {
    captured = useVerikitSchemaTreeForm({ resource });
    return null;
  }

  act(() => {
    root.render(<Probe />);
  });
  assert.ok(captured);

  act(() => {
    captured!.setFieldErrors({ email: ["Required."], name: ["Required."] });
  });
  assert.deepEqual(captured!.fieldErrors, {
    email: ["Required."],
    name: ["Required."],
  });

  // Both calls read the same pre-update `captured` snapshot, reproducing
  // "two onFieldChange calls in the same tick" the source comment describes.
  act(() => {
    captured!.treeProps.onFieldChange?.(["email"], "a@example.com");
    captured!.treeProps.onFieldChange?.(["name"], "Ada");
  });

  assert.deepEqual(captured!.fieldErrors, {});
});
