import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text, textarea } from "@verikit/core";
import { VerikitClientError } from "@verikit/client";
import { action } from "@verikit/runtime";
import { h, nextTick } from "vue";
import { ResourceDetail } from "../../src/resource/resource-detail.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "../query/fixtures.js";

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

async function click(root: ParentNode, label: string): Promise<void> {
  const [button] = buttons(root, label);
  assert.ok(button, `no button with text "${label}"`);
  button.click();
  await nextTick();
}

function dialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

function texts(root: ParentNode, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map(
    (node) => node.textContent ?? "",
  );
}

function renderDetail(
  fixture: ReturnType<typeof createFakeClient>,
  props: Record<string, unknown> = {},
) {
  const harness = setupHarness(fixture.client);
  const wrapper = harness.mountWithProvider(ResourceDetail, {
    resource: postResource,
    id: "1",
    ...props,
  });
  // The component's root element changes as it loads; its parent doesn't.
  const container = (wrapper.element as HTMLElement).parentElement!;
  return { harness, container };
}

async function renderLoaded(
  fixture: ReturnType<typeof createFakeClient>,
  props: Record<string, unknown> = {},
) {
  const rendered = renderDetail(fixture, props);
  await waitFor(() => rendered.container.querySelector("dl") !== null);
  return rendered;
}

test("shows a loading state, then each visible field's label and value", async () => {
  const fixture = createFakeClient([post]);
  const release = fixture.block("find");
  const { harness, container } = renderDetail(fixture);

  await waitFor(() => /Loading…/.test(container.textContent ?? ""));
  release();
  await waitFor(() => container.querySelector("dl") !== null);

  // `secret` is hidden and `body` isn't on the record, as when the server
  // leaves out a field the actor can't read. `status` has no label.
  assert.deepEqual(texts(container, "dt"), ["Title", "status"]);
  assert.deepEqual(texts(container, "dd"), ["Hello", "draft"]);
  // No actions requested and no renderActions: no action bar.
  assert.equal(container.querySelectorAll("button").length, 0);

  harness.cleanup();
});

test("a missing record shows as not found, and other load errors as an alert", async () => {
  const fixture = createFakeClient([post]);
  let rendered = renderDetail(fixture, { id: "missing" });
  await waitFor(() =>
    /doesn't exist or you can't view it/.test(
      rendered.container.textContent ?? "",
    ),
  );
  rendered.harness.cleanup();

  fixture.failNext.find = new Error("Server down.");
  rendered = renderDetail(fixture);
  await waitFor(
    () =>
      rendered.container.querySelector('[role="alert"]')?.textContent ===
      "Server down.",
  );
  rendered.harness.cleanup();
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
  const { harness, container } = await renderLoaded(fixture, {
    resourceActions: true,
  });

  assert.equal(buttons(container, "Feature").length, 0);
  const [publishButton] = buttons(container, "Publish");
  assert.equal(publishButton!.disabled, true);
  assert.equal(publishButton!.parentElement!.title, "Already published.");
  assert.equal(buttons(container, "Reject").length, 1);
  assert.equal(buttons(container, "Reindex").length, 0);

  harness.cleanup();
});

test("a direct action that fails shows an alert; one denied with a 404 is hidden", async () => {
  const fixture = createFakeClient([post]);
  const { harness, container } = await renderLoaded(fixture, {
    resourceActions: true,
  });

  await click(container, "Reject");
  await waitFor(() => fixture.calls.action === 1);
  assert.equal(fixture.lastAction?.options?.recordId, "1");

  fixture.failNext.action = new Error("Quota reached.");
  await waitFor(() => !buttons(container, "Feature")[0]!.disabled);
  await click(container, "Feature");
  await waitFor(() => /Quota reached\./.test(container.textContent ?? ""));

  fixture.failNext.action = new VerikitClientError(
    404,
    "Not found.",
    "NOT_FOUND",
  );
  await waitFor(() => !buttons(container, "Feature")[0]!.disabled);
  await click(container, "Feature");
  await waitFor(() => buttons(container, "Feature").length === 0);
  assert.equal(container.querySelector('[role="alert"]'), null);

  harness.cleanup();
});

test("an action run through its dialog that the server denies is hidden", async () => {
  const fixture = createFakeClient([post]);
  const { harness, container } = await renderLoaded(fixture, {
    resourceActions: true,
  });

  fixture.failNext.action = forbidden();
  await click(container, "Publish");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Yes, publish");

  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(container, "Publish").length === 0);

  harness.cleanup();
});

test("actions renders Edit and Delete with the declared actions; resourceActions can turn the latter off", async () => {
  const fixture = createFakeClient([post]);
  let rendered = await renderLoaded(fixture, {
    actions: true,
    renderActions: (record: FakeRecord) =>
      h("button", { type: "button" }, `Share ${record.id}`),
  });

  assert.equal(buttons(rendered.container, "Edit").length, 1);
  assert.equal(buttons(rendered.container, "Delete").length, 1);
  assert.equal(buttons(rendered.container, "Feature").length, 1);
  assert.equal(buttons(rendered.container, "Share 1").length, 1);
  rendered.harness.cleanup();

  rendered = await renderLoaded(fixture, {
    actions: true,
    resourceActions: false,
  });
  assert.equal(buttons(rendered.container, "Feature").length, 0);
  assert.equal(buttons(rendered.container, "Edit").length, 1);
  rendered.harness.cleanup();
});

test("editAction and deleteAction turn Edit and Delete on or off on their own", async () => {
  const fixture = createFakeClient([post]);
  let rendered = await renderLoaded(fixture, {
    actions: true,
    deleteAction: false,
  });
  assert.equal(buttons(rendered.container, "Edit").length, 1);
  assert.equal(buttons(rendered.container, "Delete").length, 0);
  assert.equal(buttons(rendered.container, "Feature").length, 1);
  rendered.harness.cleanup();

  rendered = await renderLoaded(fixture, { deleteAction: true });
  assert.equal(buttons(rendered.container, "Edit").length, 0);
  assert.equal(buttons(rendered.container, "Delete").length, 1);
  assert.equal(buttons(rendered.container, "Feature").length, 0);
  rendered.harness.cleanup();
});

test("Edit and Delete the server reports the actor can't run are hidden up front", async () => {
  const fixture = createFakeClient([post]);
  fixture.operationAvailability = {
    "1": { update: { reason: "forbidden" } },
  };
  let rendered = await renderLoaded(fixture, { actions: true });
  assert.equal(buttons(rendered.container, "Edit").length, 0);
  assert.equal(buttons(rendered.container, "Delete").length, 1);
  rendered.harness.cleanup();

  // With nothing else to show, there's no action bar.
  fixture.operationAvailability = {
    "1": { update: { reason: "forbidden" }, delete: { reason: "forbidden" } },
  };
  rendered = await renderLoaded(fixture, {
    editAction: true,
    deleteAction: true,
  });
  assert.equal(rendered.container.querySelectorAll("button").length, 0);
  rendered.harness.cleanup();
});

test("Edit saves through ResourceForm; a failed save keeps it open and a denied one hides Edit", async () => {
  const fixture = createFakeClient([post]);
  const { harness, container } = await renderLoaded(fixture, {
    actions: true,
  });

  await click(container, "Edit");
  await waitFor(() => document.querySelector('input[name="title"]') !== null);
  assert.equal(
    (document.querySelector('input[name="title"]') as HTMLInputElement).value,
    "Hello",
  );
  await click(dialog()!, "Save changes");
  await waitFor(() => fixture.calls.update === 1);
  await waitFor(() => dialog() === null);

  fixture.failNext.update = new Error("Conflict.");
  await click(container, "Edit");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Save changes");
  await waitFor(() => fixture.calls.update === 2);
  await waitFor(() => /Conflict\./.test(dialog()?.textContent ?? ""));

  fixture.failNext.update = forbidden();
  await click(dialog()!, "Save changes");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(container, "Edit").length === 0);

  harness.cleanup();
});

test("Edit and Delete denied with a 404, as the server answers a denied update or delete, are hidden", async () => {
  const fixture = createFakeClient([post]);
  const { harness, container } = await renderLoaded(fixture, {
    actions: true,
  });
  const notFound = () => new VerikitClientError(404, "Not found.", "NOT_FOUND");

  fixture.failNext.update = notFound();
  await click(container, "Edit");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Save changes");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(container, "Edit").length === 0);

  fixture.failNext.delete = notFound();
  await click(container, "Delete");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Delete");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(container, "Delete").length === 0);
  assert.equal(container.querySelector('[role="alert"]'), null);

  harness.cleanup();
});

test("Delete asks first; a failure is shown, a denial hides Delete", async () => {
  const fixture = createFakeClient([post]);
  const { harness, container } = await renderLoaded(fixture, {
    actions: true,
  });

  fixture.failNext.delete = new Error("Locked.");
  await click(container, "Delete");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Delete");
  await waitFor(() => /Locked\./.test(dialog()?.textContent ?? ""));

  fixture.failNext.delete = forbidden();
  await click(dialog()!, "Delete");
  await waitFor(() => dialog() === null);
  await waitFor(() => buttons(container, "Delete").length === 0);

  harness.cleanup();
});

test("a successful delete calls onDeleted with the record and shows it was deleted", async () => {
  const fixture = createFakeClient([post]);
  const deleted: FakeRecord[] = [];
  let rendered = await renderLoaded(fixture, {
    actions: true,
    onDeleted: (record: FakeRecord) => deleted.push(record),
  });

  const release = fixture.block("delete");
  await click(rendered.container, "Delete");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Delete");
  await waitFor(() => buttons(dialog()!, "Deleting…").length === 1);
  release();
  await waitFor(() =>
    /This posts was deleted\./.test(rendered.container.textContent ?? ""),
  );
  assert.deepEqual(
    deleted.map((record) => record.id),
    ["1"],
  );
  rendered.harness.cleanup();

  // Without onDeleted, the page still settles on the deleted message.
  fixture.records.push({ id: "2", title: "World" });
  rendered = await renderLoaded(fixture, { actions: true, id: "2" });
  await click(rendered.container, "Delete");
  await waitFor(() => dialog() !== null);
  await click(dialog()!, "Delete");
  await waitFor(() =>
    /was deleted\./.test(rendered.container.textContent ?? ""),
  );
  rendered.harness.cleanup();
});

test("the Edit and Delete dialogs can be dismissed without saving or deleting", async () => {
  const fixture = createFakeClient([post]);
  const { harness, container } = await renderLoaded(fixture, {
    actions: true,
  });

  for (const label of ["Edit", "Delete"]) {
    await click(container, label);
    await waitFor(() => dialog() !== null);
    (dialog()!.querySelector('[aria-label="Close"]') as HTMLElement).click();
    await waitFor(() => dialog() === null);
  }
  assert.equal(fixture.calls.update, 0);
  assert.equal(fixture.calls.delete, 0);

  harness.cleanup();
});
