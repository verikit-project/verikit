import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { defineResource, text } from "@verikit/core";
import { installJsdom, typeIntoInput } from "../dom-setup.js";
import { ResourceForm } from "../../src/resource/index.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "../query/fixtures.js";

const postResource = defineResource("posts", {
  fields: { title: text().required() },
});

let uninstallJsdom: () => void;

before(() => {
  uninstallJsdom = installJsdom();
});

after(async () => {
  // Same zero-delay-eviction-timer reasoning as use-resource-mutations.test.tsx.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

test("renders one input per visible field and a submit button", async () => {
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(<ResourceForm<FakeRecord> resource={postResource} />);

  assert.ok(harness.container.querySelector('input[name="title"]'));
  assert.ok(
    harness.container.querySelector('button[type="submit"]')?.textContent,
  );

  harness.cleanup();
});

test("skips a formHidden field's input, unlike a plain hidden field it's only a form concern", async () => {
  const resourceWithFormHidden = defineResource("posts", {
    fields: {
      title: text().required(),
      internalNote: text().formHidden(),
    },
  });
  const { client } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={resourceWithFormHidden} />,
  );

  assert.ok(harness.container.querySelector('input[name="title"]'));
  assert.equal(
    harness.container.querySelector('input[name="internalNote"]'),
    null,
  );

  harness.cleanup();
});

test("submitting creates a record and reports it via onSuccess", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);
  const created: FakeRecord[] = [];

  await harness.render(
    <ResourceForm<FakeRecord>
      resource={postResource}
      onSuccess={(record) => created.push(record)}
    />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "New post");

  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => calls.create === 1);
  await waitFor(() => created.length === 1);
  assert.equal(created[0]?.title, "New post");

  harness.cleanup();
});

test("submitting with an id updates instead of creating", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={postResource} id="1" />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "Changed");

  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => calls.update === 1);
  assert.equal(calls.create, 0);

  harness.cleanup();
});

test("a validation failure blocks submission and shows the field error, not a submit error", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(<ResourceForm<FakeRecord> resource={postResource} />);

  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() =>
    Boolean(harness.container.textContent?.match(/required/i)),
  );
  assert.equal(calls.create, 0);
  assert.equal(harness.container.querySelector('[role="alert"]'), null);

  harness.cleanup();
});

test("disables the submit button and swaps its label while a mutation is in flight", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={postResource} submitLabel="Create" />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "New post");

  const release = block("create");
  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(
    () =>
      (
        harness.container.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement
      ).disabled,
  );
  assert.match(
    harness.container.querySelector('button[type="submit"]')?.textContent ?? "",
    /Saving/,
  );

  release();
  await waitFor(
    () =>
      !(
        harness.container.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement
      ).disabled,
  );
  assert.match(
    harness.container.querySelector('button[type="submit"]')?.textContent ?? "",
    /Create/,
  );

  harness.cleanup();
});

test("a failed mutation surfaces as a submit-error alert", async () => {
  const { client, failNext } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  await harness.render(
    <ResourceForm<FakeRecord> resource={postResource} id="1" />,
  );

  const input = harness.container.querySelector(
    'input[name="title"]',
  ) as HTMLInputElement;
  typeIntoInput(input, "Changed");

  failNext.update = true;
  const form = harness.container.querySelector("form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() =>
    Boolean(harness.container.querySelector('[role="alert"]')),
  );
  assert.match(
    harness.container.querySelector('[role="alert"]')?.textContent ?? "",
    /Simulated update failure/,
  );

  harness.cleanup();
});
