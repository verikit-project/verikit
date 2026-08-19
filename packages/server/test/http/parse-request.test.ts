import assert from "node:assert/strict";
import test from "node:test";
import {
  boolean,
  number,
  text,
  ValidationError,
  VerikitError,
} from "@verikit/core";
import {
  parseFilters,
  readRequestBytes,
  parseJsonObjectBody,
  parseListParams,
  requireJsonObjectBody,
} from "../../src/http/parse-request.js";

test("parseListParams defaults page/pageSize when absent", () => {
  assert.deepEqual(parseListParams(new URL("https://x/posts")), {
    page: 1,
    pageSize: 25,
  });
});

test("parseListParams reads page/pageSize/search/q, clamping pageSize to 100", () => {
  assert.deepEqual(
    parseListParams(new URL("https://x/posts?page=3&pageSize=500&q=hello")),
    { page: 3, pageSize: 100, search: "hello" },
  );
  assert.deepEqual(parseListParams(new URL("https://x/posts?search=world")), {
    page: 1,
    pageSize: 25,
    search: "world",
  });
});

test("parseListParams falls back to the fallback default for invalid page/pageSize", () => {
  assert.deepEqual(
    parseListParams(new URL("https://x/posts?page=0&pageSize=-5")),
    { page: 1, pageSize: 25 },
  );
  assert.deepEqual(parseListParams(new URL("https://x/posts?page=abc")), {
    page: 1,
    pageSize: 25,
  });
});

test("parseListParams honors a custom defaultPageSize (used by the search route)", () => {
  assert.deepEqual(
    parseListParams(new URL("https://x/posts/search"), { defaultPageSize: 10 }),
    { page: 1, pageSize: 10 },
  );
});

test("parseListParams parses sort/order, defaulting direction to asc", () => {
  assert.deepEqual(parseListParams(new URL("https://x/posts?sort=title")), {
    page: 1,
    pageSize: 25,
    sort: { field: "title", direction: "asc" },
  });
  assert.deepEqual(
    parseListParams(new URL("https://x/posts?sort=title&order=desc")),
    { page: 1, pageSize: 25, sort: { field: "title", direction: "desc" } },
  );
});

test("parseFilters permits null only for exact equality", () => {
  const fields = {
    age: number().filterable().toSchema("age"),
    published: boolean().filterable().toSchema("published"),
  };
  assert.deepEqual(
    parseFilters(new URL("https://x/posts?filter[age]=null"), fields),
    { age: { eq: null } },
  );

  assert.throws(
    () =>
      parseFilters(new URL("https://x/posts?filter[age][gte]=null"), fields),
    /Invalid filters/,
  );
});

test("parseFilters rejects unknown, non-filterable, malformed, and invalid filters", () => {
  const fields = {
    age: number().filterable().toSchema("age"),
    title: text().toSchema("title"),
  };

  for (const query of [
    "filter[missing]=1",
    "filter[title]=Hello",
    "filter[age]=not-a-number",
    "filter[age][ne]=1",
  ]) {
    assert.throws(
      () => parseFilters(new URL(`https://x/posts?${query}`), fields),
      /Invalid filters/,
    );
  }
});

test("parseFilters ignores query parameters that are not filters", () => {
  const fields = { age: number().filterable().toSchema("age") };

  assert.deepEqual(
    parseFilters(new URL("https://x/posts?search=hello&page=2"), fields),
    {},
  );
});

test("parseJsonObjectBody treats an empty body as {}", async () => {
  const request = new Request("https://x/posts", { method: "POST" });
  assert.deepEqual(await parseJsonObjectBody(request), { ok: true, value: {} });
});

test("parseJsonObjectBody parses a valid JSON object body", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    body: JSON.stringify({ title: "Hi" }),
  });
  assert.deepEqual(await parseJsonObjectBody(request), {
    ok: true,
    value: { title: "Hi" },
  });
});

test("parseJsonObjectBody rejects invalid JSON", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    body: "{not json",
  });
  assert.deepEqual(await parseJsonObjectBody(request), {
    ok: false,
    reason: "invalid-json",
  });
});

test("parseJsonObjectBody rejects non-object JSON (arrays, primitives)", async () => {
  const arrayRequest = new Request("https://x/posts", {
    method: "POST",
    body: "[1,2,3]",
  });
  assert.deepEqual(await parseJsonObjectBody(arrayRequest), {
    ok: false,
    reason: "invalid-json",
  });

  const stringRequest = new Request("https://x/posts", {
    method: "POST",
    body: '"hello"',
  });
  assert.deepEqual(await parseJsonObjectBody(stringRequest), {
    ok: false,
    reason: "invalid-json",
  });
});

test("parseJsonObjectBody rejects bodies over maxBodyBytes", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    body: JSON.stringify({ title: "This is too large" }),
  });

  assert.deepEqual(await parseJsonObjectBody(request, { maxBodyBytes: 8 }), {
    ok: false,
    reason: "too-large",
  });
});

test("parseJsonObjectBody rejects declared content-length over maxBodyBytes before reading", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    headers: { "content-length": "999" },
    body: "{}",
  });

  assert.deepEqual(await parseJsonObjectBody(request, { maxBodyBytes: 8 }), {
    ok: false,
    reason: "too-large",
  });
});

test("parseJsonObjectBody allows oversized bodies when maxBodyBytes is false", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    body: JSON.stringify({ title: "This is deliberately larger than 8 bytes" }),
  });

  assert.deepEqual(
    await parseJsonObjectBody(request, { maxBodyBytes: false }),
    {
      ok: true,
      value: { title: "This is deliberately larger than 8 bytes" },
    },
  );
});

test("requireJsonObjectBody returns the parsed value for a valid body", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    body: JSON.stringify({ title: "Hi" }),
  });
  assert.deepEqual(await requireJsonObjectBody(request), { title: "Hi" });
});

test("requireJsonObjectBody throws a ValidationError for invalid JSON", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    body: "{not json",
  });

  await assert.rejects(requireJsonObjectBody(request), (error: unknown) => {
    assert.ok(error instanceof ValidationError);
    assert.equal(error.message, "Invalid JSON body.");
    assert.equal(error.status, 400);
    return true;
  });
});

test("requireJsonObjectBody throws a 413 PAYLOAD_TOO_LARGE VerikitError for an oversized body", async () => {
  const request = new Request("https://x/posts", {
    method: "POST",
    body: JSON.stringify({ title: "This is too large" }),
  });

  await assert.rejects(
    requireJsonObjectBody(request, { maxBodyBytes: 8 }),
    (error: unknown) => {
      assert.ok(error instanceof VerikitError);
      assert.ok(!(error instanceof ValidationError));
      assert.equal(error.code, "PAYLOAD_TOO_LARGE");
      assert.equal(error.status, 413);
      return true;
    },
  );
});

test("readRequestBytes enforces the actual stream length despite missing or misleading Content-Length", async () => {
  const missingLength = new Request("https://x/posts", {
    method: "POST",
    body: "x".repeat(20),
  });
  assert.deepEqual(await readRequestBytes(missingLength, 8), {
    ok: false,
    reason: "too-large",
  });

  const misleadingLength = new Request("https://x/posts", {
    method: "POST",
    headers: { "content-length": "1" },
    body: "x".repeat(20),
  });
  assert.deepEqual(await readRequestBytes(misleadingLength, 8), {
    ok: false,
    reason: "too-large",
  });
});
