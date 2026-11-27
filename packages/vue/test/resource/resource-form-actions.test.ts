import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text } from "@verikit/core";
import { VerikitClientError, type ActionResult } from "@verikit/client";
import { action } from "@verikit/runtime";
import { nextTick } from "vue";
import { ResourceForm } from "../../src/resource/resource-form.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";

const publish = action("publish")
  .label("Publish")
  .form({ note: text().required() });
const archive = action("archive").confirmation({
  title: "Archive post?",
  message: "It disappears from the site.",
  confirmLabel: "Yes, archive",
  cancelLabel: "Keep it",
});
const purge = action("purge")
  .scope("collection")
  .confirmation({ message: "Everything goes." });
const touch = action("touch").result({ successMessage: "Touched." });
const ping = action("ping");

const post = defineResource("posts", {
  fields: { title: text() },
  actions: [publish, archive, purge, touch, ping],
}).form((f) => [
  f.field("title"),
  f.action("publish"),
  f.action("archive"),
  f.action("purge"),
  f.action("touch"),
  f.action("ping"),
  f.action("ghost"),
]);

function button(label: string): HTMLButtonElement {
  const match = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );
  assert.ok(match, `no button "${label}"`);
  return match as HTMLButtonElement;
}

async function click(label: string): Promise<void> {
  button(label).click();
  await nextTick();
}

function feedback(): string {
  return (
    document.querySelector('form [role="status"], form [role="alert"]')
      ?.textContent ?? ""
  );
}

function dialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

test("an action button runs the declared action with its inline input and the form's record", async () => {
  const fixture = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(ResourceForm, {
    resource: post,
    id: "1",
  });
  await wrapper.find('input[name="note"]').setValue("Ship it");
  await click("Publish");

  await waitFor(() => feedback() === "done");
  assert.deepEqual(fixture.lastAction, {
    name: "publish",
    input: { note: "Ship it" },
    options: { recordId: "1", confirmed: undefined },
  });
  assert.equal(document.querySelector('[role="status"]')?.textContent, "done");

  harness.cleanup();
});

test("an action with a confirmation asks first, and can be cancelled", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(ResourceForm, { resource: post, id: "1" });
  await click("archive");
  await waitFor(() => dialog() !== null);
  assert.match(
    dialog()!.textContent ?? "",
    /Archive post\?.*It disappears from the site\./,
  );

  await click("Keep it");
  await waitFor(() => dialog() === null);
  assert.equal(fixture.calls.action, 0);

  await click("archive");
  await waitFor(() => dialog() !== null);
  await click("Yes, archive");
  await waitFor(() => fixture.calls.action === 1);
  assert.deepEqual(fixture.lastAction?.options, {
    recordId: "1",
    confirmed: true,
  });
  await waitFor(() => dialog() === null);

  harness.cleanup();
});

test("a collection action runs without the record, with default confirmation labels", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(ResourceForm, { resource: post, id: "1" });
  await click("purge");
  await waitFor(() => dialog() !== null);
  // No title: the action's name stands in.
  assert.match(
    dialog()!.textContent ?? "",
    /purge.*Everything goes\..*Cancel.*Confirm/,
  );
  await click("Confirm");

  await waitFor(() => fixture.calls.action === 1);
  assert.equal(fixture.lastAction?.options?.recordId, undefined);
  assert.equal(fixture.lastAction?.input, undefined);

  harness.cleanup();
});

test("success falls back to the declared message, then the action's label or name", async () => {
  const fixture = createFakeClient([]);
  const resource = fixture.client.resource("posts");
  const client = {
    ...fixture.client,
    resource: () => ({
      ...resource,
      action: async (): Promise<ActionResult<unknown>> => ({ result: null }),
    }),
  } as unknown as typeof fixture.client;
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(ResourceForm, { resource: post });
  await click("touch");
  await waitFor(() => feedback() === "Touched.");
  await click("ping");
  await waitFor(() => feedback() === "ping done.");
  await wrapper.find('input[name="note"]').setValue("x");
  await click("Publish");
  await waitFor(() => feedback() === "Publish done.");

  harness.cleanup();
});

test("a failed action shows its error and any validation issues", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(ResourceForm, { resource: post, id: "1" });

  fixture.failNext.action = new VerikitClientError(
    400,
    "Invalid input.",
    "VALIDATION_ERROR",
    { issues: [{ path: ["note"], message: "Note is required." }] },
  );
  await click("ping");
  await waitFor(() => feedback() === "Invalid input. Note is required.");
  assert.ok(document.querySelector('form [role="alert"]'));

  fixture.failNext.action = new VerikitClientError(
    409,
    "Too late.",
    "CONFLICT",
  );
  await click("ping");
  await waitFor(() => feedback() === "Too late.");

  fixture.failNext.action = new Error("offline");
  await click("ping");
  await waitFor(() => feedback() === "offline");

  harness.cleanup();
});

test("a button for an undeclared action says so; onAction replaces the default", async () => {
  const fixture = createFakeClient([]);
  const harness = setupHarness(fixture.client);

  harness.mountWithProvider(ResourceForm, { resource: post.toSchema() });
  await click("ghost");
  assert.equal(feedback(), `"ghost" isn't an action declared on posts.`);
  harness.cleanup();

  const custom = setupHarness(fixture.client);
  const calls: [string, unknown][] = [];
  custom.mountWithProvider(ResourceForm, {
    resource: post,
    onAction: (name: string, path: unknown) => calls.push([name, path]),
  });
  await click("ping");
  assert.deepEqual(calls, [["ping", ["ping"]]]);
  assert.equal(fixture.calls.action, 0);
  custom.cleanup();

  // A schema without any declared actions.
  const bare = setupHarness(fixture.client);
  const plain = defineResource("notes", { fields: { body: text() } })
    .form((f) => [f.field("body"), f.action("ping")])
    .toSchema();
  bare.mountWithProvider(ResourceForm, { resource: plain });
  await click("ping");
  assert.equal(feedback(), `"ping" isn't an action declared on notes.`);
  bare.cleanup();
});
