import assert from "node:assert/strict";
import test from "node:test";
import {
  parseJsonObjectBody,
  parseListParams,
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
