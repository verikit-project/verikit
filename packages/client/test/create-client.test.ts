import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "../src/create-client.js";
import { VerikitClientError } from "../src/errors.js";
import { sendRequest } from "../src/request.js";

interface Call {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
  signal: AbortSignal | null | undefined;
}

function fakeFetch(respond: (call: Call) => Response) {
  const calls: Call[] = [];

  const fetchImpl = (async (
    input: RequestInfo | URL,
    init: RequestInit = {},
  ) => {
    const call: Call = {
      url: String(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? init.body : undefined,
      signal: init.signal,
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;

  return { fetchImpl, calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

test("list() GETs the resource base with page/pageSize/sort/order/search serialized", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({
      data: [{ id: "1" }],
      meta: { total: 1, page: 2, pageSize: 5 },
    }),
  );

  const client = createClient({
    baseUrl: "https://x.test/api///",
    fetch: fetchImpl,
  });
  const result = await client.resource("posts").list({
    page: 2,
    pageSize: 5,
    search: "hello",
    sort: { field: "title", direction: "desc" },
    filters: {
      published: { eq: true },
      views: { gte: 10, lt: 100, gt: undefined },
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0]!.url,
    "https://x.test/api/posts?page=2&pageSize=5&search=hello&sort=title&order=desc&filter%5Bpublished%5D=true&filter%5Bviews%5D%5Bgte%5D=10&filter%5Bviews%5D%5Blt%5D=100",
  );
  assert.equal(calls[0]!.method, "GET");
  assert.equal(calls[0]!.body, undefined);
  assert.deepEqual(result, {
    records: [{ id: "1" }],
    total: 1,
    page: 2,
    pageSize: 5,
  });
});

test("search() hits the /search sub-route", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: [], meta: { total: 0, page: 1, pageSize: 10 } }),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  await client.resource("posts").search({ search: "q" });

  assert.equal(calls[0]!.url, "https://x.test/posts/search?search=q");
});

test("relationship() hits the relationship picker route", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: [], meta: { total: 0, page: 1, pageSize: 10 } }),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  await client.resource("projects").relationship("organization", {
    search: "acme",
  });

  assert.equal(
    calls[0]!.url,
    "https://x.test/projects/relationships/organization?search=acme",
  );
});

test("find() encodes the id and unwraps `data`", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: { id: "a/b", title: "Hi" } }),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  const record = await client.resource("posts").find("a/b");

  assert.equal(calls[0]!.url, "https://x.test/posts/a%2Fb");
  assert.equal(calls[0]!.method, "GET");
  assert.deepEqual(record, { id: "a/b", title: "Hi" });
});

test("create() POSTs a JSON body with a Content-Type header", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: { id: "1", title: "New" } }, 201),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  const record = await client.resource("posts").create({ title: "New" });

  assert.equal(calls[0]!.method, "POST");
  assert.equal(calls[0]!.url, "https://x.test/posts");
  assert.equal(calls[0]!.body, JSON.stringify({ title: "New" }));
  assert.equal(calls[0]!.headers.get("content-type"), "application/json");
  assert.deepEqual(record, { id: "1", title: "New" });
});

test("update() PATCHes the record's id", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: { id: "1", title: "Changed" } }),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  await client.resource("posts").update("1", { title: "Changed" });

  assert.equal(calls[0]!.method, "PATCH");
  assert.equal(calls[0]!.url, "https://x.test/posts/1");
});

test("delete() DELETEs and resolves to undefined on 204", async () => {
  const { fetchImpl, calls } = fakeFetch(
    () => new Response(null, { status: 204 }),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  const result = await client.resource("posts").delete("1");

  assert.equal(calls[0]!.method, "DELETE");
  assert.equal(calls[0]!.url, "https://x.test/posts/1");
  assert.equal(result, undefined);
});

test("upload() POSTs a multipart body to the field's uploads route without a Content-Type header", async () => {
  const seen: {
    url: string;
    method: string;
    body: unknown;
    headers: Headers;
  }[] = [];
  const fetchImpl = (async (
    input: RequestInfo | URL,
    init: RequestInit = {},
  ) => {
    seen.push({
      url: String(input),
      method: init.method ?? "GET",
      body: init.body,
      headers: new Headers(init.headers),
    });
    return jsonResponse({
      data: {
        url: "https://files.example/avatar.png",
        name: "avatar.png",
        type: "image/png",
        size: 5,
      },
    });
  }) as typeof fetch;

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  const file = new Blob(["hello"], { type: "image/png" });
  const result = await client
    .resource("users")
    .upload("avatar", file, { filename: "avatar.png" });

  assert.equal(seen.length, 1);
  assert.equal(seen[0]!.method, "POST");
  assert.equal(seen[0]!.url, "https://x.test/users/uploads/avatar");
  assert.ok(seen[0]!.body instanceof FormData);
  assert.equal((seen[0]!.body as FormData).get("file") instanceof File, true);
  assert.equal(seen[0]!.headers.has("content-type"), false);
  assert.deepEqual(result, {
    url: "https://files.example/avatar.png",
    name: "avatar.png",
    type: "image/png",
    size: 5,
  });
});

test("action() only includes input/recordId/confirmed when provided", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: "ok", message: "Done." }),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  const result = await client
    .resource("posts")
    .action("publish", { note: "hi" }, { recordId: "1", confirmed: true });

  assert.equal(calls[0]!.method, "POST");
  assert.equal(calls[0]!.url, "https://x.test/posts/actions/publish");
  assert.deepEqual(JSON.parse(calls[0]!.body!), {
    input: { note: "hi" },
    recordId: "1",
    confirmed: true,
  });
  assert.deepEqual(result, { result: "ok", message: "Done." });
});

test("action() with no input/options sends an empty body", async () => {
  const { fetchImpl, calls } = fakeFetch(() => jsonResponse({ data: null }));

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  await client.resource("posts").action("approve");

  assert.deepEqual(JSON.parse(calls[0]!.body!), {});
});

test("static headers are sent on every request", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: [], meta: { total: 0, page: 1, pageSize: 25 } }),
  );

  const client = createClient({
    baseUrl: "https://x.test",
    fetch: fetchImpl,
    headers: { Authorization: "Bearer static" },
  });
  await client.resource("posts").list();

  assert.equal(calls[0]!.headers.get("authorization"), "Bearer static");
});

test("a header function is re-resolved before every request", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: { id: "1" } }),
  );
  let token = "first";

  const client = createClient({
    baseUrl: "https://x.test",
    fetch: fetchImpl,
    headers: () => ({ Authorization: `Bearer ${token}` }),
  });
  const resource = client.resource("posts");

  await resource.find("1");
  token = "second";
  await resource.find("1");

  assert.equal(calls[0]!.headers.get("authorization"), "Bearer first");
  assert.equal(calls[1]!.headers.get("authorization"), "Bearer second");
});

test("an AbortSignal is forwarded to fetch", async () => {
  const { fetchImpl, calls } = fakeFetch(() =>
    jsonResponse({ data: { id: "1" } }),
  );
  const controller = new AbortController();

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });
  await client.resource("posts").find("1", { signal: controller.signal });

  assert.equal(calls[0]!.signal, controller.signal);
});

test("an error envelope with issues/extra becomes a typed VerikitClientError", async () => {
  const { fetchImpl } = fakeFetch(() =>
    jsonResponse(
      {
        error: {
          code: "CONFIRMATION_REQUIRED",
          message: "Confirmation required.",
          confirmationRequired: true,
        },
      },
      409,
    ),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });

  await assert.rejects(
    () => client.resource("posts").action("publish"),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.equal(error.status, 409);
      assert.equal(error.code, "CONFIRMATION_REQUIRED");
      assert.equal(error.message, "Confirmation required.");
      assert.deepEqual(error.extra, { confirmationRequired: true });
      assert.equal(error.issues, undefined);
      return true;
    },
  );
});

test('an error envelope with no code falls back to VerikitClientError.code "UNKNOWN"', async () => {
  const { fetchImpl } = fakeFetch(() =>
    jsonResponse({ error: { message: "Something went wrong." } }, 500),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });

  await assert.rejects(
    () => client.resource("posts").find("1"),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.equal(error.code, "UNKNOWN");
      return true;
    },
  );
});

test("validation issues on a 400/422 response populate VerikitClientError.issues", async () => {
  const { fetchImpl } = fakeFetch(() =>
    jsonResponse(
      {
        error: {
          message: "Validation failed.",
          issues: [{ path: ["title"], message: "Required." }],
        },
      },
      400,
    ),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });

  await assert.rejects(
    () => client.resource("posts").create({}),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.deepEqual(error.issues, [
        { path: ["title"], message: "Required." },
      ]);
      assert.equal(error.extra, undefined);
      return true;
    },
  );
});

test("a non-JSON error body falls back to the response's statusText", async () => {
  const { fetchImpl } = fakeFetch(
    () =>
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        statusText: "Bad Gateway",
      }),
  );

  const client = createClient({ baseUrl: "https://x.test", fetch: fetchImpl });

  await assert.rejects(
    () => client.resource("posts").find("1"),
    (error: unknown) => {
      assert.ok(error instanceof VerikitClientError);
      assert.equal(error.status, 502);
      assert.equal(error.message, "Bad Gateway");
      assert.equal(error.code, "UNKNOWN");
      return true;
    },
  );
});

test("a 200 response with an empty body resolves to undefined", async () => {
  const fetchImpl = (async () =>
    new Response("", { status: 200 })) as typeof fetch;

  const result = await sendRequest({
    fetchImpl,
    baseUrl: "https://x.test",
    method: "GET",
    segments: ["posts"],
  });

  assert.equal(result, undefined);
});

test("sendRequest with no segments hits the base URL directly", async () => {
  const { fetchImpl, calls } = fakeFetch(() => jsonResponse({ data: "root" }));

  await sendRequest({
    fetchImpl,
    baseUrl: "https://x.test/api",
    method: "GET",
    segments: [],
  });

  assert.equal(calls[0]!.url, "https://x.test/api");
});

test("createClient defaults to the global fetch when none is supplied", () => {
  const client = createClient({ baseUrl: "https://x.test" });
  assert.equal(typeof client.resource("posts").list, "function");
});

test("createClient's default fetch survives being called as params.fetchImpl(...), not fetch(...) (regression: browsers throw 'Illegal invocation' on a detached fetch reference)", async (t) => {
  // request.ts invokes the stored fetch as `params.fetchImpl(...)`, so `this`
  // inside it is the `params` object unless the reference was bound. Real
  // browser `fetch` enforces its receiver be `globalThis`/`window` and throws
  // if it isn't; Node's global fetch doesn't enforce this, so it can't catch
  // an unbound reference on its own. This fake reproduces the browser check.
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = function (this: unknown) {
    if (this !== globalThis) {
      throw new TypeError("Illegal invocation");
    }
    return Promise.resolve(Response.json({ data: { id: "1" } }));
  } as typeof fetch;

  const client = createClient({ baseUrl: "https://x.test" });
  const record = await client.resource("posts").find("1");

  assert.deepEqual(record, { id: "1" });
});
