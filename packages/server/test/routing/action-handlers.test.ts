import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text, boolean } from "@verikit/core";
import { action } from "@verikit/runtime";
import { createServer } from "../../src/create-server.js";
import { generateOpenApiDocument } from "../../src/openapi/index.js";

const info = { title: "Test", version: "1.0.0" };
import { buildRouteTable } from "../../src/routing/route-table.js";
import { createInMemoryAdapter } from "../fixtures.js";

// Client-safe declarations: no `.execute()`, so they can live in shared code.
const publish = action("publish")
  .label("Publish")
  .confirmation("Publish this post?")
  .form({ note: text().required() });
const archive = action("archive").label("Archive").scope("collection");

function postResource() {
  return defineResource("post", {
    fields: {
      title: text().required(),
      published: boolean().default(false),
    },
    actions: [publish, archive],
  });
}

function publishRequest(body: unknown): Request {
  return new Request("https://x/post/actions/publish", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

test("declared actions serialize on the resource schema without handlers", () => {
  const schema = postResource().toSchema();

  assert.equal(schema.actions?.publish?.label, "Publish");
  assert.equal(
    schema.actions?.publish?.confirmation?.message,
    "Publish this post?",
  );
  assert.equal(schema.actions?.publish?.form?.note?.required, true);
  assert.equal(schema.actions?.archive?.scope, "collection");
});

test("handlers built from declarations run with the declaration's form and confirmation", async () => {
  const handler = createServer({
    resources: [
      {
        resource: postResource(),
        adapter: createInMemoryAdapter(),
        handlers: [
          publish
            .availableWhen(() => true)
            .execute(({ input }) => `published: ${input.note}`),
        ],
        permissions: "open",
      },
    ],
  });

  const unconfirmed = await handler(publishRequest({ input: { note: "x" } }));
  assert.equal(unconfirmed.status, 409);

  const invalid = await handler(publishRequest({ confirmed: true, input: {} }));
  assert.equal(invalid.status, 422);

  const ok = await handler(
    publishRequest({ confirmed: true, input: { note: "hi" } }),
  );
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).data, "published: hi");
});

test("declared actions without a handler get no route", async () => {
  const handler = createServer({
    resources: [
      {
        resource: postResource(),
        adapter: createInMemoryAdapter(),
        handlers: [publish.execute(() => "ok")],
        permissions: "open",
      },
    ],
  });

  const response = await handler(
    new Request("https://x/post/actions/archive", {
      method: "POST",
      body: "{}",
    }),
  );
  assert.equal(response.status, 404);
});

test("buildRouteTable rejects a handler for an undeclared action", () => {
  assert.throws(
    () =>
      buildRouteTable(
        [
          {
            resource: postResource(),
            adapter: createInMemoryAdapter(),
            handlers: [action("delete").execute(() => "ok")],
            permissions: "open",
          },
        ],
        "",
      ),
    /handler for undeclared action "delete"/,
  );
});

test("buildRouteTable rejects a handler without .execute()", () => {
  assert.throws(
    () =>
      buildRouteTable(
        [
          {
            resource: postResource(),
            adapter: createInMemoryAdapter(),
            handlers: [publish],
            permissions: "open",
          },
        ],
        "",
      ),
    /action "publish" has no \.execute\(\) function/,
  );
});

test("buildRouteTable rejects a handler that diverges from its declaration", () => {
  assert.throws(
    () =>
      buildRouteTable(
        [
          {
            resource: postResource(),
            adapter: createInMemoryAdapter(),
            handlers: [publish.label("Ship it").execute(() => "ok")],
            permissions: "open",
          },
        ],
        "",
      ),
    /handler for action "publish" does not match its declaration/,
  );
});

test("buildRouteTable accepts an equivalent handler declared in a different order", () => {
  const [entry] = buildRouteTable(
    [
      {
        resource: postResource(),
        adapter: createInMemoryAdapter(),
        handlers: [
          action("publish")
            .form({ note: text().required() })
            .confirmation("Publish this post?")
            .label("Publish")
            .execute(() => "ok"),
        ],
        permissions: "open",
      },
    ],
    "",
  );

  assert.deepEqual(
    entry!.actions.map((resolved) => resolved.name),
    ["publish"],
  );
});

test("buildRouteTable rejects a handler that duplicates a deprecated action", (t) => {
  t.mock.method(console, "warn", () => {});

  assert.throws(
    () =>
      buildRouteTable(
        [
          {
            resource: postResource(),
            adapter: createInMemoryAdapter(),
            handlers: [publish.execute(() => "ok")],
            actions: [action("publish").execute(() => "legacy")],
            permissions: "open",
          },
        ],
        "",
      ),
    /duplicate action "publish"/,
  );
});

test("deprecated actions are still served and warn once per resource config", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const config = {
    resource: postResource(),
    adapter: createInMemoryAdapter(),
    actions: [action("legacy").execute(() => "legacy")],
    permissions: "open" as const,
  };

  const handler = createServer({ resources: [config] });
  generateOpenApiDocument({ resources: [config] }, info);

  assert.equal(warn.mock.callCount(), 1);
  assert.match(
    String(warn.mock.calls[0]!.arguments[0]),
    /Resource "post": `actions` in createServer\(\) is deprecated/,
  );

  const response = await handler(
    new Request("https://x/post/actions/legacy", {
      method: "POST",
      body: "{}",
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data, "legacy");
});

test("OpenAPI documents only actions that have handlers", () => {
  const document = generateOpenApiDocument(
    {
      resources: [
        {
          resource: postResource(),
          adapter: createInMemoryAdapter(),
          handlers: [publish.execute(() => "ok")],
          permissions: "open",
        },
      ],
    },
    info,
  );

  assert.ok(document.paths["/post/actions/publish"]);
  assert.equal(document.paths["/post/actions/archive"], undefined);
  assert.ok(document.components?.schemas?.postPublishInput);
});
