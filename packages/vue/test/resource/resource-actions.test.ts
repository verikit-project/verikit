import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { action } from "@verikit/runtime";
import { nextTick } from "vue";
import { ResourceForm } from "../../src/resource/resource-form.js";
import { ResourceTable } from "../../src/resource/resource-table.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";

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

function root(wrapper: { element: unknown }): HTMLElement {
  return wrapper.element as HTMLElement;
}

function buttons(container: ParentNode, label: string): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent === label,
  ) as HTMLButtonElement[];
}

async function click(container: ParentNode, label: string): Promise<void> {
  const [button] = buttons(container, label);
  assert.ok(button, `no button with text "${label}"`);
  button.click();
  await nextTick();
}

async function type(selector: string, value: string): Promise<void> {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  assert.ok(input, `no input matching ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

function dialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

async function renderTable(
  fixture: ReturnType<typeof createFakeClient>,
  props: { actions?: boolean; resourceActions?: boolean } = {
    resourceActions: true,
  },
) {
  const harness = setupHarness(fixture.client);
  const wrapper = harness.mountWithProvider(ResourceTable, {
    resource: postResource,
    ...props,
  });
  await waitFor(() => root(wrapper).textContent?.includes("Hello") === true);
  return { harness, container: root(wrapper) };
}

test("declared record actions render per row and collection actions in the toolbar", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const { harness, container } = await renderTable(fixture);

  // Desktop row + mobile card each render the row's actions.
  assert.equal(buttons(container, "Feature").length, 2);
  assert.equal(buttons(container, "Publish").length, 2);
  assert.equal(buttons(container, "Reject").length, 2);
  assert.equal(buttons(container, "Reindex").length, 1);
  assert.equal(buttons(container, "Purge").length, 1);
  // Built-in CRUD stays off: only `resourceActions` was set.
  assert.equal(buttons(container, "New").length, 0);

  harness.cleanup();
});

test("resourceActions defaults to `actions` and can be turned off independently", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const withActions = await renderTable(fixture, { actions: true });
  assert.equal(buttons(withActions.container, "Reindex").length, 1);
  withActions.harness.cleanup();

  const without = await renderTable(fixture, {
    actions: true,
    resourceActions: false,
  });
  assert.equal(buttons(without.container, "Reindex").length, 0);
  assert.equal(buttons(without.container, "Feature").length, 0);
  without.harness.cleanup();

  const plain = await renderTable(fixture, {});
  assert.equal(buttons(plain.container, "Feature").length, 0);
  plain.harness.cleanup();
});

test("an action without confirmation or form runs on click, scoped to its row, and refetches the list", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const { harness, container } = await renderTable(fixture);

  await click(container, "Feature");
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
  const { harness, container } = await renderTable(fixture);

  await click(container, "Publish");
  await waitFor(() => dialog() !== null);

  assert.match(dialog()!.textContent ?? "", /Publish post\?/);
  assert.match(
    dialog()!.textContent ?? "",
    /Readers will see it immediately\./,
  );
  assert.equal(buttons(dialog()!, "Not now").length, 1);

  await click(dialog()!, "Yes, publish");
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
  const { harness, container } = await renderTable(fixture);

  await click(container, "Publish");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Not now");
  await waitFor(() => dialog() === null);

  assert.equal(fixture.calls.action, 0);

  harness.cleanup();
});

test("an action form validates client-side, then sends the inferred input", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const { harness, container } = await renderTable(fixture);

  await click(container, "Reject");
  await waitFor(() => Boolean(document.querySelector('input[name="reason"]')));

  await click(dialog()!, "Reject");
  await waitFor(() => /required/i.test(dialog()?.textContent ?? ""));
  assert.equal(fixture.calls.action, 0);

  await type('input[name="reason"]', "Spam");
  await click(dialog()!, "Reject");
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
  const { harness, container } = await renderTable(fixture);

  await click(container, "Reject");
  await waitFor(() => Boolean(document.querySelector('input[name="reason"]')));
  await type('input[name="reason"]', "Meh");
  await click(dialog()!, "Reject");

  await waitFor(() => /Too vague\./.test(dialog()?.textContent ?? ""));
  assert.match(dialog()!.textContent ?? "", /Validation failed\./);

  harness.cleanup();
});

test("a non-permission failure inside the dialog is shown and keeps it open", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  fixture.failNext.action = new Error("Publishing is paused.");
  const { harness, container } = await renderTable(fixture);

  await click(container, "Publish");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Yes, publish");

  await waitFor(() =>
    /Publishing is paused\./.test(dialog()?.textContent ?? ""),
  );
  assert.ok(dialog());

  harness.cleanup();
});

test("the dialog shows a pending label while the action runs", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const release = fixture.block("action");
  const { harness, container } = await renderTable(fixture);

  await click(container, "Publish");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Yes, publish");

  await waitFor(() => buttons(dialog()!, "Running…").length === 1);
  assert.equal(buttons(dialog()!, "Running…")[0]!.disabled, true);

  release();
  await waitFor(() => dialog() === null);

  harness.cleanup();
});

test("a 403 from a dialog action closes it and hides that action for that row only", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  fixture.failNext.action = forbidden();
  const { harness, container } = await renderTable(fixture);

  await click(container, "Publish");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Yes, publish");

  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(container, "Publish").length === 2);
  assert.equal(fixture.lastAction?.options?.recordId, "1");

  harness.cleanup();
});

test("a 403 from a direct row action hides it for that row; other failures show an alert until the next run", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  const { harness, container } = await renderTable(fixture);

  fixture.failNext.action = new Error("Feature quota reached.");
  await click(container, "Feature");
  await waitFor(() =>
    /Feature quota reached\./.test(container.textContent ?? ""),
  );

  await click(container, "Feature");
  await waitFor(() => fixture.calls.action === 2);
  // Direct runs disable the action buttons until they settle.
  await waitFor(() => !buttons(container, "Feature")[0]!.disabled);
  await waitFor(
    () => !/Feature quota reached\./.test(container.textContent ?? ""),
  );

  fixture.failNext.action = forbidden();
  await click(container, "Feature");
  await waitFor(() => buttons(container, "Feature").length === 2);
  assert.equal(
    container.querySelector('[role="alert"]'),
    null,
    "a denial hides the action rather than showing an error",
  );

  harness.cleanup();
});

test("denials accumulate per row across different actions", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const { harness, container } = await renderTable(fixture);

  fixture.failNext.action = forbidden();
  await click(container, "Feature");
  await waitFor(() => buttons(container, "Feature").length === 0);

  fixture.failNext.action = forbidden();
  await click(container, "Publish");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Yes, publish");
  await waitFor(() => buttons(container, "Publish").length === 0);

  assert.equal(buttons(container, "Feature").length, 0);
  assert.equal(buttons(container, "Reject").length, 2);

  harness.cleanup();
});

test("collection actions run without a record id, and a 403 hides them from the toolbar", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const { harness, container } = await renderTable(fixture);

  await click(container, "Reindex");
  await waitFor(() => fixture.calls.action === 1);
  assert.deepEqual(fixture.lastAction?.options, {
    recordId: undefined,
    confirmed: undefined,
  });
  await waitFor(() => !buttons(container, "Purge")[0]!.disabled);

  fixture.failNext.action = forbidden();
  await click(container, "Purge");
  await waitFor(() => dialog() !== null);
  assert.match(dialog()!.textContent ?? "", /Purge everything\?/);
  // No confirmLabel/cancelLabel declared: falls back to the label and "Cancel".
  assert.equal(buttons(dialog()!, "Cancel").length, 1);
  await click(dialog()!, "Purge");

  await waitFor(() => buttons(container, "Purge").length === 0);
  assert.equal(buttons(container, "Reindex").length, 1);

  harness.cleanup();
});

test("ResourceForm renders declared action nodes without an actions prop", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);
  const withLayout = postResource.form((form) => [
    form.field("title"),
    form.action("reject"),
  ]);

  const wrapper = harness.mountWithProvider(ResourceForm, {
    resource: withLayout,
  });
  await waitFor(() =>
    Boolean(root(wrapper).querySelector('input[name="reason"]')),
  );
  assert.equal(buttons(root(wrapper), "Reject").length, 1);

  harness.cleanup();
});

test("a 404 from a record action is the server's denial: it hides the action for that row, direct or via the dialog", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  const { harness, container } = await renderTable(fixture);

  fixture.failNext.action = notFound();
  await click(container, "Feature");
  await waitFor(() => buttons(container, "Feature").length === 2);

  fixture.failNext.action = notFound();
  await click(container, "Publish");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Yes, publish");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(container, "Publish").length === 2);

  assert.equal(
    container.querySelector('[role="alert"]'),
    null,
    "a denial hides the action rather than showing an error",
  );

  harness.cleanup();
});

test("a 404 from a collection action is shown as an error, not treated as a denial", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const { harness, container } = await renderTable(fixture);

  fixture.failNext.action = notFound();
  await click(container, "Reindex");
  await waitFor(() => /Not found\./.test(container.textContent ?? ""));
  assert.equal(buttons(container, "Reindex").length, 1);

  harness.cleanup();
});

test("the table asks for action availability only when it shows declared actions", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const first = await renderTable(fixture);
  assert.equal(fixture.lastListParams?.includeActions, true);
  first.harness.cleanup();

  const second = await renderTable(fixture, { resourceActions: false });
  assert.equal(fixture.lastListParams?.includeActions, undefined);
  second.harness.cleanup();
});

test("actions the list reports forbidden are hidden; unavailable ones are disabled with the reason", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Hello" },
    { id: "2", title: "World" },
  ]);
  fixture.actionAvailability = {
    records: {
      "1": {
        feature: { reason: "forbidden" },
        publish: { reason: "unavailable", message: "Already published." },
      },
    },
    collection: {
      purge: { reason: "forbidden" },
      reindex: { reason: "unavailable" },
    },
  };
  const { harness, container } = await renderTable(fixture);

  // Two layouts (table and cards) render each row; only row 2 keeps Feature.
  assert.equal(buttons(container, "Feature").length, 2);
  const publish = buttons(container, "Publish");
  assert.deepEqual(
    publish.map((button) => button.disabled),
    [true, false, true, false],
  );
  assert.equal(publish[0]!.parentElement!.title, "Already published.");

  assert.equal(buttons(container, "Purge").length, 0);
  assert.equal(buttons(container, "Reindex")[0]!.disabled, true);

  harness.cleanup();
});

test("an action the server reports unavailable when run refetches the list", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const { harness, container } = await renderTable(fixture);
  const listCalls = fixture.calls.list;

  fixture.failNext.action = new VerikitClientError(
    422,
    "Feature quota reached.",
    "ACTION_UNAVAILABLE",
  );
  fixture.actionAvailability = {
    records: { "1": { feature: { reason: "unavailable" } } },
    collection: {},
  };
  await click(container, "Feature");

  await waitFor(() => fixture.calls.list > listCalls);
  await waitFor(() => buttons(container, "Feature")[0]!.disabled);
  await waitFor(() =>
    /Feature quota reached\./.test(container.textContent ?? ""),
  );

  harness.cleanup();
});
