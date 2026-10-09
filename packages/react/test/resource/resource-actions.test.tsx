import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { defineResource, text } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { action } from "@verikit/runtime";
import { act } from "react";
import { installJsdom, typeIntoInput } from "../dom-setup.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "../query/fixtures.js";

// Imported dynamically after `installJsdom()`, for the floating-ui reason
// documented in resource-table.test.tsx.
let ResourceTable: typeof import("../../src/resource/index.js").ResourceTable;
let ResourceForm: typeof import("../../src/resource/index.js").ResourceForm;

// Client-safe declarations: these are all the UI needs, no handlers.
const feature = action("feature").label("Feature");
const publish = action("publish")
  .label("Publish")
  .variant("primary")
  .confirmation({
    title: "Publish post?",
    message: "Readers will see it immediately.",
    confirmLabel: "Yes, publish",
    cancelLabel: "Not now",
  });
const reject = action("reject")
  .label("Reject")
  .variant("danger")
  .form({ reason: text().required() });
const reindex = action("reindex").label("Reindex").scope("collection");
const purge = action("purge")
  .label("Purge")
  .scope("collection")
  .variant("danger")
  .confirmation("Purge everything?");

const postResource = defineResource("posts", {
  fields: { title: text().required() },
  actions: [feature, publish, reject, reindex, purge],
});

function forbidden(): VerikitClientError {
  return new VerikitClientError(403, "Forbidden.", "FORBIDDEN");
}

function notFound(): VerikitClientError {
  return new VerikitClientError(404, "Not found.", "NOT_FOUND");
}

function buttons(root: ParentNode, label: string): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll("button")).filter(
    (button) => button.textContent === label,
  ) as HTMLButtonElement[];
}

function click(root: ParentNode, label: string): void {
  const [button] = buttons(root, label);
  assert.ok(button, `no button with text "${label}"`);
  act(() => {
    button.click();
  });
}

function dialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

let uninstallJsdom: () => void;

before(async () => {
  uninstallJsdom = installJsdom();
  ({ ResourceTable, ResourceForm } =
    await import("../../src/resource/index.js"));
});

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

async function renderTable(
  fixture: ReturnType<typeof createFakeClient>,
  props: { actions?: boolean; resourceActions?: boolean } = {
    resourceActions: true,
  },
) {
  const harness = setupHarness(fixture.client);
  await harness.render(
    <ResourceTable<FakeRecord> resource={postResource} {...props} />,
  );
  await waitFor(() =>
    Boolean(harness.container.textContent?.includes("Hello")),
  );
  return harness;
}

test("declared record actions render per row and collection actions in the toolbar", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  // Desktop row + mobile card each render the row's actions.
  assert.equal(buttons(harness.container, "Feature").length, 2);
  assert.equal(buttons(harness.container, "Publish").length, 2);
  assert.equal(buttons(harness.container, "Reject").length, 2);
  assert.equal(buttons(harness.container, "Reindex").length, 1);
  assert.equal(buttons(harness.container, "Purge").length, 1);
  // Built-in CRUD stays off: only `resourceActions` was set.
  assert.equal(buttons(harness.container, "New").length, 0);

  harness.cleanup();
});

test("resourceActions defaults to `actions` and can be turned off independently", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const withActions = await renderTable(fixture, { actions: true });
  assert.equal(buttons(withActions.container, "Reindex").length, 1);
  withActions.cleanup();

  const without = await renderTable(fixture, {
    actions: true,
    resourceActions: false,
  });
  assert.equal(buttons(without.container, "Reindex").length, 0);
  assert.equal(buttons(without.container, "Feature").length, 0);
  without.cleanup();

  const plain = await renderTable(fixture, {});
  assert.equal(buttons(plain.container, "Feature").length, 0);
  plain.cleanup();
});

test("an action without confirmation or form runs on click, scoped to its row, and refetches the list", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  click(harness.container, "Feature");
  await waitFor(() => fixture.calls.action === 1);

  assert.deepEqual(fixture.lastAction, {
    name: "feature",
    input: undefined,
    options: { recordId: "1", confirmed: undefined },
  });
  assert.equal(dialog(), null);
  await waitFor(() => fixture.calls.list === 2);

  harness.cleanup();
});

test("a confirmed action shows its declared copy and sends confirmed: true", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);

  assert.match(dialog()!.textContent ?? "", /Publish post\?/);
  assert.match(
    dialog()!.textContent ?? "",
    /Readers will see it immediately\./,
  );
  assert.equal(buttons(dialog()!, "Not now").length, 1);

  click(dialog()!, "Yes, publish");
  await waitFor(() => fixture.calls.action === 1);
  assert.deepEqual(fixture.lastAction?.options, {
    recordId: "1",
    confirmed: true,
  });
  await waitFor(() => dialog() === null);

  harness.cleanup();
});

test("cancelling a confirmation runs nothing", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Not now");
  await waitFor(() => dialog() === null);

  assert.equal(fixture.calls.action, 0);

  harness.cleanup();
});

test("an action form validates client-side, then sends the inferred input", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  click(harness.container, "Reject");
  await waitFor(() => Boolean(document.querySelector('input[name="reason"]')));
  assert.match(dialog()!.textContent ?? "", /Reject/);

  click(dialog()!, "Reject");
  await waitFor(() => /required/i.test(dialog()?.textContent ?? ""));
  assert.equal(fixture.calls.action, 0);

  typeIntoInput(
    document.querySelector('input[name="reason"]') as HTMLInputElement,
    "Spam",
  );
  click(dialog()!, "Reject");
  await waitFor(() => fixture.calls.action === 1);

  assert.deepEqual(fixture.lastAction, {
    name: "reject",
    input: { reason: "Spam" },
    options: { recordId: "1", confirmed: undefined },
  });
  await waitFor(() => dialog() === null);

  harness.cleanup();
});

test("server validation issues on an action form map onto its fields", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.action = new VerikitClientError(
    422,
    "Validation failed.",
    "VALIDATION_ERROR",
    { issues: [{ path: ["reason"], message: "Too vague." }] },
  );
  const harness = await renderTable(fixture);

  click(harness.container, "Reject");
  await waitFor(() => Boolean(document.querySelector('input[name="reason"]')));
  typeIntoInput(
    document.querySelector('input[name="reason"]') as HTMLInputElement,
    "Meh",
  );
  click(dialog()!, "Reject");

  await waitFor(() => /Too vague\./.test(dialog()?.textContent ?? ""));
  assert.match(dialog()!.textContent ?? "", /Validation failed\./);

  harness.cleanup();
});

test("a non-permission failure inside the dialog is shown and keeps it open", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.action = new Error("Publishing is paused.");
  const harness = await renderTable(fixture);

  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Yes, publish");

  await waitFor(() =>
    /Publishing is paused\./.test(dialog()?.textContent ?? ""),
  );
  assert.ok(dialog());

  harness.cleanup();
});

test("a 403 from a dialog action closes it and hides that action for that row only", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  fixture.failNext.action = forbidden();
  const harness = await renderTable(fixture);

  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Yes, publish");

  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(harness.container, "Publish").length === 2);
  assert.equal(fixture.lastAction?.options?.recordId, "1");

  harness.cleanup();
});

test("a 403 from a direct row action hides it for that row; other failures show an alert until the next run", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  const harness = await renderTable(fixture);

  fixture.failNext.action = new Error("Feature quota reached.");
  click(harness.container, "Feature");
  await waitFor(() =>
    /Feature quota reached\./.test(harness.container.textContent ?? ""),
  );

  click(harness.container, "Feature");
  await waitFor(() => fixture.calls.action === 2);
  // Direct runs disable the action buttons until they settle.
  await waitFor(() => !buttons(harness.container, "Feature")[0]!.disabled);
  await waitFor(
    () => !/Feature quota reached\./.test(harness.container.textContent ?? ""),
  );

  fixture.failNext.action = forbidden();
  click(harness.container, "Feature");
  await waitFor(() => buttons(harness.container, "Feature").length === 2);
  assert.equal(
    harness.container.querySelector('[role="alert"]'),
    null,
    "a denial hides the action rather than showing an error",
  );

  harness.cleanup();
});

test("collection actions run without a record id, and a 403 hides them from the toolbar", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  click(harness.container, "Reindex");
  await waitFor(() => fixture.calls.action === 1);
  assert.deepEqual(fixture.lastAction?.options, {
    recordId: undefined,
    confirmed: undefined,
  });
  await waitFor(() => !buttons(harness.container, "Purge")[0]!.disabled);

  fixture.failNext.action = forbidden();
  click(harness.container, "Purge");
  await waitFor(() => dialog() !== null);
  assert.match(dialog()!.textContent ?? "", /Purge everything\?/);
  // No confirmLabel/cancelLabel declared: falls back to the label and "Cancel".
  assert.equal(buttons(dialog()!, "Cancel").length, 1);
  click(dialog()!, "Purge");

  await waitFor(() => buttons(harness.container, "Purge").length === 0);
  assert.equal(buttons(harness.container, "Reindex").length, 1);

  harness.cleanup();
});

test("ResourceForm renders declared action nodes without an actions prop", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);
  const withLayout = postResource.form((form) => [
    form.field("title"),
    form.action("reject"),
  ]);

  await harness.render(<ResourceForm resource={withLayout} />);
  await waitFor(() =>
    Boolean(harness.container.querySelector('input[name="reason"]')),
  );
  assert.equal(buttons(harness.container, "Reject").length, 1);

  harness.cleanup();
});

test("the dialog shows a pending label while the action runs", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const release = fixture.block("action");
  const harness = await renderTable(fixture);

  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Yes, publish");

  await waitFor(() => buttons(dialog()!, "Running…").length === 1);
  assert.equal(buttons(dialog()!, "Running…")[0]!.disabled, true);

  act(() => release());
  await waitFor(() => dialog() === null);

  harness.cleanup();
});

test("denials accumulate per row across different actions", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  fixture.failNext.action = forbidden();
  click(harness.container, "Feature");
  await waitFor(() => buttons(harness.container, "Feature").length === 0);

  fixture.failNext.action = forbidden();
  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Yes, publish");
  await waitFor(() => buttons(harness.container, "Publish").length === 0);

  assert.equal(buttons(harness.container, "Feature").length, 0);
  assert.equal(buttons(harness.container, "Reject").length, 2);

  harness.cleanup();
});

test("a 404 from a record action is the server's denial: it hides the action for that row, direct or via the dialog", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  const harness = await renderTable(fixture);

  fixture.failNext.action = notFound();
  click(harness.container, "Feature");
  await waitFor(() => buttons(harness.container, "Feature").length === 2);

  fixture.failNext.action = notFound();
  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Yes, publish");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(harness.container, "Publish").length === 2);

  assert.equal(
    harness.container.querySelector('[role="alert"]'),
    null,
    "a denial hides the action rather than showing an error",
  );

  harness.cleanup();
});

test("a 404 from a collection action is shown as an error, not treated as a denial", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = await renderTable(fixture);

  fixture.failNext.action = notFound();
  click(harness.container, "Reindex");
  await waitFor(() => /Not found\./.test(harness.container.textContent ?? ""));
  assert.equal(buttons(harness.container, "Reindex").length, 1);

  harness.cleanup();
});
