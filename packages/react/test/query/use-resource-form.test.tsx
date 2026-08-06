import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { text, type FieldSchema } from "@verikit/core";
import { act } from "react";
import { installJsdom } from "../dom-setup.js";
import { useResourceForm } from "../../src/query/index.js";
import {
  createFakeClient,
  setupHarness,
  waitFor,
  type FakeRecord,
} from "./fixtures.js";

const fields: Record<string, FieldSchema> = {
  title: text().required().toSchema("title"),
};

let uninstallJsdom: () => void;

before(() => {
  uninstallJsdom = installJsdom();
});

after(async () => {
  // Same zero-delay-eviction-timer reasoning as use-resource-mutations.test.tsx.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

test("useResourceForm creates a record with no id, and reports it via onSuccess", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;
  const onSuccessCalls: FakeRecord[] = [];

  function Probe() {
    form = useResourceForm<FakeRecord>("posts", {
      fields,
      onSuccess: (record) => onSuccessCalls.push(record),
    });
    return null;
  }

  await harness.render(<Probe />);

  const result = await act(async () => form!.submit({ title: "New" }));
  assert.equal(result.success, true);
  assert.equal(calls.create, 1);
  assert.equal(calls.update, 0);
  assert.equal(onSuccessCalls.length, 1);
  assert.equal(onSuccessCalls[0]?.title, "New");

  harness.cleanup();
});

test("useResourceForm updates the given id instead of creating a new record", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;

  function Probe() {
    form = useResourceForm<FakeRecord>("posts", { fields, id: "1" });
    return null;
  }

  await harness.render(<Probe />);

  const result = await act(async () => form!.submit({ title: "Changed" }));
  assert.equal(result.success, true);
  assert.equal(calls.update, 1);
  assert.equal(calls.create, 0);

  harness.cleanup();
});

test("useResourceForm's validation failure prevents any create/update call", async () => {
  const { client, calls } = createFakeClient([]);
  const harness = setupHarness(client);

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;

  function Probe() {
    form = useResourceForm<FakeRecord>("posts", { fields });
    return null;
  }

  await harness.render(<Probe />);

  const result = await act(async () => form!.submit({ title: "" }));
  assert.equal(result.success, false);
  assert.equal(calls.create, 0);
  assert.ok(form!.fieldErrors.title?.length);

  harness.cleanup();
});

test("useResourceForm's isSubmitting reflects the underlying mutation while it's in flight", async () => {
  const { client, block } = createFakeClient([]);
  const harness = setupHarness(client);

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;

  function Probe() {
    form = useResourceForm<FakeRecord>("posts", { fields });
    return null;
  }

  await harness.render(<Probe />);
  assert.equal(form!.isSubmitting, false);

  const release = block("create");
  let pending: Promise<unknown> | undefined;

  await act(() => {
    pending = form!.submit({ title: "New" });
  });

  await waitFor(() => form!.isSubmitting === true);

  release();
  await act(async () => {
    await pending;
  });

  assert.equal(form!.isSubmitting, false);

  harness.cleanup();
});

test("useResourceForm's submitError surfaces a failed mutation", async () => {
  const { client, failNext } = createFakeClient([{ id: "1", title: "Hello" }]);
  const harness = setupHarness(client);

  let form: ReturnType<typeof useResourceForm<FakeRecord>> | undefined;

  function Probe() {
    form = useResourceForm<FakeRecord>("posts", { fields, id: "1" });
    return null;
  }

  await harness.render(<Probe />);
  assert.equal(form!.submitError, null);

  failNext.update = true;
  await act(async () => {
    await assert.rejects(() => form!.submit({ title: "Changed" }));
  });

  await waitFor(() => form!.submitError !== null);
  assert.match(form!.submitError!.message, /Simulated update failure/);

  harness.cleanup();
});
