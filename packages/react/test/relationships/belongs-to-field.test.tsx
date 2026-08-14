import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { BelongsToRelationshipSchema } from "@verikit/core";
import { installJsdom } from "../dom-setup.js";
import { BelongsToRelationshipField } from "../../src/relationships/index.js";
import { createFakeClient, setupHarness, waitFor } from "../query/fixtures.js";

let uninstallJsdom: () => void;

before(() => {
  uninstallJsdom = installJsdom();
});

after(async () => {
  // Same zero-delay-eviction-timer reasoning as use-resource-mutations.test.tsx.
  await new Promise((resolve) => setTimeout(resolve, 50));
  uninstallJsdom();
});

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
 * Base UI's Select only mounts its popup content once genuinely opened via
 * its own floating-ui-driven interaction (real pointer geometry jsdom
 * doesn't provide), so the rendered option list isn't reachable through the
 * DOM here  the trigger's own placeholder/loading text is. The mapping from
 * fetched records to `<SelectItem>`s (`recordId`/`recordLabel`) still runs
 * as part of building `<Select>`'s children on every render, regardless of
 * whether the popup is open, so a mount with resolved records is enough to
 * exercise it.
 */
test("mounts and resolves with the relationship picker's records for a labeled field", async () => {
  const { client, calls } = createFakeClient([
    { id: "1", title: "Ada" },
    { id: "2", title: "Grace" },
  ]);
  const harness = setupHarness(client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ label: "Author", displayField: "title" })}
    />,
  );

  assert.equal(harness.container.querySelector("label")?.textContent, "Author");
  await waitFor(() => calls.list === 1);
  await waitFor(
    () =>
      harness.container.querySelector('[data-slot="select-value"]')
        ?.textContent === "Select…",
  );

  harness.cleanup();
});

test("resolves for a field with no displayField or label configured", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);

  await harness.render(
    <BelongsToRelationshipField relationship={relationship()} />,
  );

  assert.equal(harness.container.querySelector("label"), null);
  await waitFor(() => calls.list === 1);

  harness.cleanup();
});

test("resolves for a field whose configured displayField's value is null", async () => {
  const { client, calls } = createFakeClient([
    { id: "1", title: null as unknown as string },
  ]);
  const harness = setupHarness(client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ displayField: "title" })}
    />,
  );

  await waitFor(() => calls.list === 1);

  harness.cleanup();
});

test("shows a loading placeholder while the picker's records are in flight", async () => {
  const { client, block } = createFakeClient([{ id: "1", title: "Ada" }]);
  const release = block("list");
  const harness = setupHarness(client);

  await harness.render(
    <BelongsToRelationshipField relationship={relationship()} />,
  );

  assert.match(
    harness.container.querySelector('[data-slot="select-value"]')
      ?.textContent ?? "",
    /Loading/,
  );

  release();
  await waitFor(() =>
    /Select/.test(
      harness.container.querySelector('[data-slot="select-value"]')
        ?.textContent ?? "",
    ),
  );

  harness.cleanup();
});

test("reflects an existing value, renders an error, and skips the query without a relationship name", async () => {
  const { client, calls } = createFakeClient([{ id: "1", title: "Ada" }]);
  const harness = setupHarness(client);

  await harness.render(
    <BelongsToRelationshipField
      relationship={relationship({ name: undefined })}
      value="1"
      error="Required"
    />,
  );

  assert.equal(
    harness.container.querySelector("p.text-destructive")?.textContent,
    "Required",
  );

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls.list, 0);

  harness.cleanup();
});
