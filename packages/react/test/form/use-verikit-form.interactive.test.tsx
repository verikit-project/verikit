import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { text, type FieldSchema } from "@verikit/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { installJsdom } from "../dom-setup.js";
import { useVerikitForm, type UseVerikitFormResult } from "../../src/index.js";

const fields: Record<string, FieldSchema> = {
  email: text().required().toSchema("email"),
  name: text().required().toSchema("name"),
};

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

test("two onValueChange calls in the same tick each clear their own field's error, not just the last one", () => {
  let captured: UseVerikitFormResult | undefined;

  function Probe() {
    captured = useVerikitForm({ fields });
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
  // "two onValueChange calls in the same tick" the source comment describes.
  act(() => {
    captured!.getFieldProps("email").onValueChange?.("a@example.com");
    captured!.getFieldProps("name").onValueChange?.("Ada");
  });

  assert.deepEqual(captured!.fieldErrors, {});
});
