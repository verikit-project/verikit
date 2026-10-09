import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { defineResource, text, textarea } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { action } from "@verikit/runtime";
import { act } from "react";
import { installJsdom } from "../dom-setup.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "../query/fixtures.js";

// Imported dynamically after `installJsdom()`, for the floating-ui reason
// documented in resource-table.test.tsx.
let ResourceDetail: typeof import("../../src/resource/index.js").ResourceDetail;

const feature = action("feature").label("Feature");
const publish = action("publish").label("Publish").confirmation({
  title: "Publish post?",
  message: "Readers will see it.",
  confirmLabel: "Yes, publish",
});
const reject = action("reject").label("Reject").variant("danger");
const reindex = action("reindex").label("Reindex").scope("collection");

const postResource = defineResource("posts", {
  fields: {
    title: text().required().label("Title"),
    status: text(),
    secret: text().hidden(),
    body: textarea(),
  },
  actions: [feature, publish, reject, reindex],
});

const post: FakeRecord = {
  id: "1",
  title: "Hello",
  status: "draft",
  secret: "x",
};

function forbidden(): VerikitClientError {
  return new VerikitClientError(403, "Forbidden.", "FORBIDDEN");
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

function texts(root: ParentNode, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map(
    (node) => node.textContent ?? "",
  );
}

let uninstallJsdom: () => void;

before(async () => {
  uninstallJsdom = installJsdom();
  ({ ResourceDetail } = await import("../../src/resource/index.js"));
});

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

async function renderDetail(
  fixture: ReturnType<typeof createFakeClient>,
  props: Partial<Parameters<typeof ResourceDetail<FakeRecord>>[0]> = {},
) {
  const harness = setupHarness(fixture.client);
  await harness.render(
    <ResourceDetail<FakeRecord> resource={postResource} id="1" {...props} />,
  );
  return harness;
}

async function renderLoaded(
  fixture: ReturnType<typeof createFakeClient>,
  props: Partial<Parameters<typeof ResourceDetail<FakeRecord>>[0]> = {},
) {
  const harness = await renderDetail(fixture, props);
  await waitFor(() => harness.container.querySelector("dl") !== null);
  return harness;
}

test("shows a loading state, then each visible field's label and value", async () => {
  const fixture = createFakeClient([post]);
  const release = fixture.block("find");
  const harness = await renderDetail(fixture);

  assert.match(harness.container.textContent ?? "", /Loading…/);
  release();
  await waitFor(() => harness.container.querySelector("dl") !== null);

  // `secret` is hidden and `body` isn't on the record, as when the server
  // leaves out a field the actor can't read. `status` has no label.
  assert.deepEqual(texts(harness.container, "dt"), ["Title", "status"]);
  assert.deepEqual(texts(harness.container, "dd"), ["Hello", "draft"]);
  // No actions requested and no renderActions: no action bar.
  assert.equal(harness.container.querySelectorAll("button").length, 0);

  harness.cleanup();
});

test("a missing record shows as not found, and other load errors as an alert", async () => {
  const fixture = createFakeClient([post]);
  let harness = await renderDetail(fixture, { id: "missing" });
  await waitFor(() =>
    /doesn't exist or you can't view it/.test(
      harness.container.textContent ?? "",
    ),
  );
  harness.cleanup();

  fixture.failNext.find = new Error("Server down.");
  harness = await renderDetail(fixture);
  await waitFor(
    () =>
      harness.container.querySelector('[role="alert"]')?.textContent ===
      "Server down.",
  );
  harness.cleanup();
});

test("declared record actions follow the server's availability; collection actions aren't shown", async () => {
  const fixture = createFakeClient([post]);
  fixture.actionAvailability = {
    records: {
      "1": {
        feature: { reason: "forbidden" },
        publish: { reason: "unavailable", message: "Already published." },
      },
    },
    collection: {},
  };
  const harness = await renderLoaded(fixture, { resourceActions: true });

  assert.equal(buttons(harness.container, "Feature").length, 0);
  const [publishButton] = buttons(harness.container, "Publish");
  assert.equal(publishButton!.disabled, true);
  assert.equal(publishButton!.parentElement!.title, "Already published.");
  assert.equal(buttons(harness.container, "Reject").length, 1);
  assert.equal(buttons(harness.container, "Reindex").length, 0);

  harness.cleanup();
});

test("a direct action that fails shows an alert; one denied with a 404 is hidden", async () => {
  const fixture = createFakeClient([post]);
  const harness = await renderLoaded(fixture, { resourceActions: true });

  click(harness.container, "Reject");
  await waitFor(() => fixture.calls.action === 1);
  assert.equal(fixture.lastAction?.options?.recordId, "1");

  fixture.failNext.action = new Error("Quota reached.");
  click(harness.container, "Feature");
  await waitFor(() =>
    /Quota reached\./.test(harness.container.textContent ?? ""),
  );

  fixture.failNext.action = new VerikitClientError(
    404,
    "Not found.",
    "NOT_FOUND",
  );
  click(harness.container, "Feature");
  await waitFor(() => buttons(harness.container, "Feature").length === 0);
  assert.equal(harness.container.querySelector('[role="alert"]'), null);

  harness.cleanup();
});

test("an action run through its dialog that the server denies is hidden", async () => {
  const fixture = createFakeClient([post]);
  const harness = await renderLoaded(fixture, { resourceActions: true });

  fixture.failNext.action = forbidden();
  click(harness.container, "Publish");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Yes, publish");

  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(harness.container, "Publish").length === 0);

  harness.cleanup();
});

test("actions renders Edit and Delete with the declared actions; resourceActions can turn the latter off", async () => {
  const fixture = createFakeClient([post]);
  let harness = await renderLoaded(fixture, {
    actions: true,
    renderActions: (record) => <button type="button">Share {record.id}</button>,
  });

  assert.equal(buttons(harness.container, "Edit").length, 1);
  assert.equal(buttons(harness.container, "Delete").length, 1);
  assert.equal(buttons(harness.container, "Feature").length, 1);
  assert.equal(buttons(harness.container, "Share 1").length, 1);
  harness.cleanup();

  harness = await renderLoaded(fixture, {
    actions: true,
    resourceActions: false,
  });
  assert.equal(buttons(harness.container, "Feature").length, 0);
  assert.equal(buttons(harness.container, "Edit").length, 1);
  harness.cleanup();
});

test("editAction and deleteAction turn Edit and Delete on or off on their own", async () => {
  const fixture = createFakeClient([post]);
  let harness = await renderLoaded(fixture, {
    actions: true,
    deleteAction: false,
  });
  assert.equal(buttons(harness.container, "Edit").length, 1);
  assert.equal(buttons(harness.container, "Delete").length, 0);
  assert.equal(buttons(harness.container, "Feature").length, 1);
  harness.cleanup();

  harness = await renderLoaded(fixture, { deleteAction: true });
  assert.equal(buttons(harness.container, "Edit").length, 0);
  assert.equal(buttons(harness.container, "Delete").length, 1);
  assert.equal(buttons(harness.container, "Feature").length, 0);
  harness.cleanup();
});

test("Edit and Delete the server reports the actor can't run are hidden up front", async () => {
  const fixture = createFakeClient([post]);
  fixture.operationAvailability = {
    "1": { update: { reason: "forbidden" } },
  };
  let harness = await renderLoaded(fixture, { actions: true });
  assert.equal(buttons(harness.container, "Edit").length, 0);
  assert.equal(buttons(harness.container, "Delete").length, 1);
  harness.cleanup();

  // With nothing else to show, there's no action bar.
  fixture.operationAvailability = {
    "1": { update: { reason: "forbidden" }, delete: { reason: "forbidden" } },
  };
  harness = await renderLoaded(fixture, {
    editAction: true,
    deleteAction: true,
  });
  assert.equal(harness.container.querySelectorAll("button").length, 0);
  harness.cleanup();
});

test("Edit saves through ResourceForm; a failed save keeps it open and a denied one hides Edit", async () => {
  const fixture = createFakeClient([post]);
  const harness = await renderLoaded(fixture, { actions: true });

  click(harness.container, "Edit");
  await waitFor(() => Boolean(document.querySelector('input[name="title"]')));
  assert.equal(
    (document.querySelector('input[name="title"]') as HTMLInputElement).value,
    "Hello",
  );
  click(dialog()!, "Save changes");
  await waitFor(() => fixture.calls.update === 1);
  await waitFor(() => dialog() === null);

  fixture.failNext.update = new Error("Conflict.");
  click(harness.container, "Edit");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Save changes");
  await waitFor(() => fixture.calls.update === 2);
  await waitFor(() => /Conflict\./.test(dialog()?.textContent ?? ""));

  fixture.failNext.update = forbidden();
  click(dialog()!, "Save changes");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(harness.container, "Edit").length === 0);

  harness.cleanup();
});

test("Edit and Delete denied with a 404, as the server answers a denied update or delete, are hidden", async () => {
  const fixture = createFakeClient([post]);
  const harness = await renderLoaded(fixture, { actions: true });
  const notFound = () => new VerikitClientError(404, "Not found.", "NOT_FOUND");

  fixture.failNext.update = notFound();
  click(harness.container, "Edit");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Save changes");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(harness.container, "Edit").length === 0);

  fixture.failNext.delete = notFound();
  click(harness.container, "Delete");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Delete");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(harness.container, "Delete").length === 0);
  assert.equal(harness.container.querySelector('[role="alert"]'), null);

  harness.cleanup();
});

test("Delete asks first; a failure is shown, a denial hides Delete", async () => {
  const fixture = createFakeClient([post]);
  const harness = await renderLoaded(fixture, { actions: true });

  fixture.failNext.delete = new Error("Locked.");
  click(harness.container, "Delete");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Delete");
  await waitFor(() => /Locked\./.test(dialog()?.textContent ?? ""));

  fixture.failNext.delete = forbidden();
  click(dialog()!, "Delete");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(harness.container, "Delete").length === 0);

  harness.cleanup();
});

test("a successful delete calls onDeleted with the record and shows it was deleted", async () => {
  const fixture = createFakeClient([post]);
  const deleted: FakeRecord[] = [];
  let harness = await renderLoaded(fixture, {
    actions: true,
    onDeleted: (record) => deleted.push(record),
  });

  const release = fixture.block("delete");
  click(harness.container, "Delete");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Delete");
  await waitFor(() => buttons(dialog()!, "Deleting…").length === 1);
  release();
  await waitFor(() =>
    /This posts was deleted\./.test(harness.container.textContent ?? ""),
  );
  assert.deepEqual(
    deleted.map((record) => record.id),
    ["1"],
  );
  harness.cleanup();

  // Without onDeleted, the page still settles on the deleted message.
  fixture.records.push({ id: "2", title: "World" });
  harness = await renderLoaded(fixture, { actions: true, id: "2" });
  click(harness.container, "Delete");
  await waitFor(() => dialog() !== null);
  click(dialog()!, "Delete");
  await waitFor(() =>
    /was deleted\./.test(harness.container.textContent ?? ""),
  );
  harness.cleanup();
});

test("the Edit and Delete dialogs can be dismissed without saving or deleting", async () => {
  const fixture = createFakeClient([post]);
  const harness = await renderLoaded(fixture, { actions: true });

  for (const label of ["Edit", "Delete"]) {
    click(harness.container, label);
    await waitFor(() => dialog() !== null);
    act(() => {
      (dialog()!.querySelector('[aria-label="Close"]') as HTMLElement).click();
    });
    await waitFor(() => dialog() === null);
  }
  assert.equal(fixture.calls.update, 0);
  assert.equal(fixture.calls.delete, 0);

  harness.cleanup();
});
