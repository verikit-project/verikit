import assert from "node:assert/strict";
import test from "node:test";
import type { BelongsToRelationshipSchema } from "@verikit/core";
import { BelongsToRelationshipField } from "../../src/relationships/belongs-to-field.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";

function relationship(
  patch: Partial<BelongsToRelationshipSchema> = {},
): BelongsToRelationshipSchema {
  return {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "authors",
    foreignKey: "authorId",
    ...patch,
  };
}

/**
 * Reka UI's Select only mounts its popup content once genuinely opened via
 * its own floating-ui-driven interaction (real pointer geometry jsdom
 * doesn't provide), so the rendered option list isn't reachable through the
 * DOM here — the trigger's own placeholder/loading text is. The mapping from
 * fetched records to `<SelectItem>`s still runs as part of building
 * `<Select>`'s children on every render regardless of whether the popup is
 * open, so a mount with resolved records is enough to exercise it.
 */
test("mounts and resolves with the relationship picker's records for a labeled field", async () => {
  const fixture = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(fixture.client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ label: "Author", displayField: "title" }),
  });

  assert.equal(wrapper.find("label").text(), "Author");
  await waitFor(() => fixture.calls.list === 1);
  assert.equal(fixture.lastListParams?.pageSize, 100);
  await waitFor(
    () => wrapper.find('[data-slot="select-value"]').text() === "Select…",
  );

  harness.cleanup();
});

test("resolves for a field with no displayField or label configured", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship(),
  });

  assert.equal(wrapper.find("label").exists(), false);
  await waitFor(() => calls.list === 1);

  harness.cleanup();
});

test("resolves for a field whose configured displayField's value is null", async () => {
  const { client, calls } = createFakeClient([
    { id: "1", title: null as unknown as string },
  ]);
  const harness = setupHarness(client);

  harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ displayField: "title" }),
  });

  await waitFor(() => calls.list === 1);

  harness.cleanup();
});

test("shows a loading placeholder while the picker's records are in flight", async () => {
  const { client, block } = createFakeClient([{ id: "1", title: "Ada" }]);
  const release = block("list");
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship(),
  });

  assert.match(wrapper.find('[data-slot="select-value"]').text(), /Loading/);

  release();
  await waitFor(() => /Select/.test(wrapper.find('[data-slot="select-value"]').text()));

  harness.cleanup();
});

test("reflects an existing value, renders an error, and skips the query without a relationship name", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ name: undefined }),
    value: "1",
    error: "Required",
  });

  assert.equal(wrapper.find("p.text-destructive").text(), "Required");

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls.list, 0);

  harness.cleanup();
});

test("supports an explicit id, null value, disabled and read-only picker", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship({ label: "Author" }),
    id: "author-picker",
    value: null,
    disabled: true,
    readOnly: true,
    className: "custom-picker",
  });

  await waitFor(() => calls.list === 1);
  const trigger = wrapper.get('[data-slot="select-trigger"]');
  assert.equal(trigger.attributes("id"), "author-picker");
  assert.equal(trigger.attributes("disabled"), "");
  assert.equal(wrapper.find(".custom-picker").exists(), true);

  harness.cleanup();
});

test("shows a relationship fetch failure instead of silently leaving the picker empty", async () => {
  const { client, failNext } = createFakeClient([]);
  failNext.list = new Error("Could not load authors.");
  const harness = setupHarness(client);

  const wrapper = harness.mountWithProvider(BelongsToRelationshipField, {
    relationship: relationship(),
  });

  await waitFor(() => wrapper.find('[role="alert"]').exists());
  assert.match(wrapper.find('[role="alert"]').text(), /Could not load authors/);

  harness.cleanup();
});
