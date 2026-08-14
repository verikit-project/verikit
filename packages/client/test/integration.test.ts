import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "../src/create-client.js";
import { VerikitClientError } from "../src/errors.js";
import { createTestServerFetch, type Post } from "./fixtures.js";

/**
 * Exercises the client against a real `createServer()`
 * handler (not a mock), confirming the request shape the client builds actually matches what the server expects.
 *  */

function clientAs(fetchImpl: typeof fetch, role: "admin" | "viewer") {
  return createClient({
    baseUrl: "https://example.test/api",
    fetch: fetchImpl,
    headers: { "x-role": role },
  }).resource<Post>("post");
}

test("list/search/create/find/update/delete round-trip through a real server", async () => {
  const { fetch: fetchImpl } = createTestServerFetch([
    { id: "1", title: "Hello", body: "world", published: false },
  ]);
  const viewer = clientAs(fetchImpl, "viewer");

  const listed = await viewer.list();
  assert.equal(listed.total, 1);
  assert.equal(listed.records[0]!.title, "Hello");
  assert.equal(listed.page, 1);

  const searched = await viewer.search({ search: "hello" });
  assert.equal(searched.records.length, 1);

  const created = await viewer.create({ title: "New post" });
  assert.equal(created.title, "New post");

  const found = await viewer.find(created.id);
  assert.equal(found.id, created.id);

  const updated = await viewer.update(created.id, { published: true });
  assert.equal(updated.published, true);

  const admin = clientAs(fetchImpl, "admin");
  await admin.delete(created.id);
  await assert.rejects(() => viewer.find(created.id), VerikitClientError);
});

test("a validation failure surfaces as a VerikitClientError with issues", async () => {
  const { fetch: fetchImpl } = createTestServerFetch();
  const viewer = clientAs(fetchImpl, "viewer");

  await assert.rejects(
    () => viewer.create({}),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.ok(error.issues && error.issues.length > 0);
      return true;
    },
  );
});

test("delete denied by permissions surfaces as 404, not 403 (existence oracle)", async () => {
  const { fetch: fetchImpl } = createTestServerFetch([
    { id: "1", title: "Hello", body: "world", published: false },
  ]);
  const viewer = clientAs(fetchImpl, "viewer");

  await assert.rejects(
    () => viewer.delete("1"),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.equal(error.status, 404);
      assert.equal(error.code, "NOT_FOUND");
      return true;
    },
  );
});

test("an unscoped action denied by permissions surfaces as 403", async () => {
  const { fetch: fetchImpl } = createTestServerFetch();
  const viewer = clientAs(fetchImpl, "viewer");

  await assert.rejects(
    () => viewer.action("publish"),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.equal(error.status, 403);
      assert.equal(error.code, "FORBIDDEN");
      return true;
    },
  );
});

test("an action requiring confirmation reports it via status/code/extra, then succeeds once confirmed", async () => {
  const { fetch: fetchImpl } = createTestServerFetch([
    { id: "1", title: "Hello", body: "world", published: false },
  ]);
  const admin = clientAs(fetchImpl, "admin");

  await assert.rejects(
    () => admin.action("publish", undefined, { recordId: "1" }),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.equal(error.status, 409);
      assert.equal(error.code, "CONFIRMATION_REQUIRED");
      assert.equal(error.extra?.confirmationRequired, true);
      return true;
    },
  );

  const confirmed = await admin.action<{ id: string; published: boolean }>(
    "publish",
    undefined,
    { recordId: "1", confirmed: true },
  );
  assert.deepEqual(confirmed.result, { id: "1", published: true });
});
