import assert from "node:assert/strict";
import test from "node:test";
import {
  belongsTo,
  definePermissions,
  defineResource,
  hasMany,
  text,
} from "@verikit/core";
import { createServer } from "../src/create-server.js";
import type { ResourceAdapter } from "../src/adapter.js";
import { handleFind } from "../src/handlers/find.js";
import { handleList } from "../src/handlers/list.js";
import { buildRouteTable } from "../src/routing/route-table.js";
import { createInMemoryAdapter } from "../src/testing/in-memory-adapter.js";

interface Actor {
  tenant: string;
  role: "admin" | "viewer";
}

const author = defineResource("author", {
  fields: {
    name: text().required(),
    email: text(),
    tenant: text().required(),
  },
  access: { scope: ({ actor }) => ({ tenant: (actor as Actor).tenant }) },
});

const category = defineResource("category", {
  fields: { title: text().required() },
});

const article = defineResource("article", {
  fields: {
    title: text().required().searchable(),
    authorId: text().tableHidden(),
    editorId: text(),
    categoryId: text(),
    reviewerId: text(),
  },
  relationships: (field) => ({
    author: belongsTo(() => author)
      .displayField("name")
      .via(field("authorId")),
    // Reads the same target through another key, with a field that's null on
    // some authors.
    editor: belongsTo(() => author)
      .displayField("email")
      .via(field("editorId")),
    // No displayField: nothing to label.
    category: belongsTo(() => category).via(field("categoryId")),
    // Target isn't registered with the server.
    reviewer: belongsTo(() =>
      defineResource("reviewer", { fields: { name: text() } }),
    )
      .displayField("name")
      .via(field("reviewerId")),
    comments: hasMany(() => category).via(field("categoryId")),
  }),
});

const authorRecords = [
  { id: "a1", name: "Ada", email: "ada@x.dev", tenant: "one" },
  { id: "a2", name: "Grace", email: null, tenant: "one" },
  { id: "a3", name: "Other tenant", email: "o@x.dev", tenant: "two" },
  { id: "a4", name: "Secret", email: "s@x.dev", tenant: "one" },
];

const articleRecords = [
  { id: "p1", title: "One", authorId: "a1", editorId: "a2", categoryId: "c1" },
  { id: "p2", title: "Two", authorId: "a1", editorId: "a1", categoryId: null },
  { id: "p3", title: "Three", authorId: "a3", editorId: null },
  { id: "p4", title: "Four", authorId: "a4", editorId: "a4" },
  { id: "p5", title: "Five", authorId: null, editorId: "missing" },
];

function serverFor(
  options: {
    authorAdapter?: ResourceAdapter;
    articlePermissions?: ReturnType<typeof definePermissions<Actor>>;
  } = {},
) {
  const authorPermissions = definePermissions<Actor>()
    .can("list", true)
    .can("read", ({ record }) => (record as { id: string }).id !== "a4")
    .field("name", { read: true })
    .field("tenant", { read: true })
    .field("email", {
      read: ({ actor }) => (actor as Actor).role === "admin",
    });

  return createServer<Actor>({
    context: (request) => ({
      tenant: "one",
      role: request.headers.get("x-role") === "admin" ? "admin" : "viewer",
    }),
    resources: [
      {
        resource: article,
        adapter: createInMemoryAdapter(articleRecords),
        permissions: options.articlePermissions ?? "open",
      },
      {
        resource: author,
        adapter: options.authorAdapter ?? createInMemoryAdapter(authorRecords),
        permissions: authorPermissions,
      },
      {
        resource: category,
        adapter: createInMemoryAdapter([{ id: "c1", title: "News" }]),
        permissions: "open",
      },
    ],
  });
}

async function get(
  handler: (request: Request) => Promise<Response>,
  path: string,
  headers: Record<string, string> = {},
) {
  const response = await handler(new Request(`https://x${path}`, { headers }));
  return { status: response.status, body: await response.json() };
}

test("include=relationships labels a list page's belongsTo keys the actor can read", async () => {
  const { status, body } = await get(
    serverFor(),
    "/article?include=relationships",
  );

  assert.equal(status, 200);
  assert.deepEqual(body.meta.relationships, {
    // a3 is out of scope; a4 fails the record's read rule.
    author: { a1: "Ada" },
    // The viewer can't read `email`.
    editor: {},
  });
  assert.equal(body.meta.actions, undefined);
});

test("a label is left out when its displayField is null, and readable fields are labelled per record", async () => {
  const { body } = await get(serverFor(), "/article?include=relationships", {
    "x-role": "admin",
  });

  // a2's email is null; "missing" doesn't exist.
  assert.deepEqual(body.meta.relationships.editor, { a1: "ada@x.dev" });
});

test("search accepts include=relationships and combines it with include=actions", async () => {
  const { status, body } = await get(
    serverFor(),
    "/article/search?search=one&include=relationships,actions",
  );

  assert.equal(status, 200);
  assert.deepEqual(body.meta.relationships, {
    author: { a1: "Ada" },
    editor: {},
  });
  assert.deepEqual(body.meta.actions, { records: {}, collection: {} });
});

test("a page with no foreign keys makes no label query", async () => {
  let listed = 0;
  const adapter = createInMemoryAdapter(authorRecords);
  const { body } = await get(
    serverFor({
      authorAdapter: {
        ...adapter,
        list: (params) => {
          listed += 1;
          return adapter.list(params);
        },
      },
    }),
    "/article?include=relationships&ids=p5&ids=missing",
  );

  assert.deepEqual(
    body.data.map((record: { id: string }) => record.id),
    ["p5"],
  );
  // `editor` still asks about "missing"; `author` has no keys on this page.
  assert.equal(listed, 1);
  assert.deepEqual(body.meta.relationships, { author: {}, editor: {} });
});

test("labels ignore records an adapter returns that weren't asked for", async () => {
  const adapter = createInMemoryAdapter(authorRecords);
  const { body } = await get(
    serverFor({
      authorAdapter: {
        ...adapter,
        // Ignores `ids` entirely.
        list: ({ ids: _ids, ...params }) => adapter.list(params),
      },
    }),
    "/article?include=relationships&ids=p1",
    { "x-role": "admin" },
  );

  assert.deepEqual(body.meta.relationships, {
    author: { a1: "Ada" },
    // Asked for a2 but got the first author (a1), which isn't labelled.
    editor: {},
  });
});

test("a foreign key the actor can't read gets no label", async () => {
  const articlePermissions = definePermissions<Actor>()
    .can("list", true)
    .can("read", true)
    .field("title", { read: true })
    .field("editorId", { read: true });
  const { body } = await get(
    serverFor({ articlePermissions }),
    "/article?include=relationships",
    { "x-role": "admin" },
  );

  assert.deepEqual(body.meta.relationships, {
    author: {},
    editor: { a1: "ada@x.dev" },
  });
});

test("find with include=relationships labels the record, alone or with actions", async () => {
  const handler = serverFor();

  const labelled = await get(handler, "/article/p1?include=relationships");
  assert.deepEqual(labelled.body.meta, {
    relationships: { author: { a1: "Ada" }, editor: {} },
  });

  const both = await get(handler, "/article/p1?include=actions,relationships");
  assert.deepEqual(both.body.meta, {
    actions: {},
    operations: {},
    relationships: { author: { a1: "Ada" }, editor: {} },
  });

  const plain = await get(handler, "/article/p1");
  assert.equal(plain.body.meta, undefined);
});

test("an unknown include is still rejected", async () => {
  const { status, body } = await get(serverFor(), "/article?include=authors");

  assert.equal(status, 400);
  assert.deepEqual(body.error.issues, [
    { path: ["include"], message: 'Unknown include "authors".' },
  ]);
});

test("ids narrows a list, and more than 100 are rejected", async () => {
  const handler = serverFor();
  const narrowed = await get(handler, "/article?ids=p2&ids=p4");
  assert.deepEqual(
    narrowed.body.data.map((record: { id: string }) => record.id),
    ["p2", "p4"],
  );

  const tooMany = new URLSearchParams(
    Array.from({ length: 101 }, (_, index) => ["ids", `p${index}`]),
  );
  const rejected = await get(handler, `/article?${tooMany}`);
  assert.equal(rejected.status, 400);
  assert.deepEqual(rejected.body.error.issues, [
    { path: ["ids"], message: "At most 100 ids can be requested at once." },
  ]);
});

test("a picker searches its relationship's displayField even when it isn't searchable", async () => {
  const handler = serverFor();
  const { body } = await get(
    handler,
    "/article/relationships/author?search=gra&include=relationships",
  );

  assert.deepEqual(
    body.data.map((record: { id: string }) => record.id),
    ["a2"],
  );
  // Pickers ignore include.
  assert.equal(body.meta.relationships, undefined);

  // `email` isn't statically readable, so it can't be searched even as the
  // editor picker's displayField.
  const editor = await get(handler, "/article/relationships/editor?search=ada");
  assert.deepEqual(editor.body.data, []);

  // Without a displayField, only `.searchable()` fields are searched (none).
  const categories = await get(
    handler,
    "/article/relationships/category?search=news",
  );
  assert.deepEqual(categories.body.data, []);
});

test("handlers called without a route table label nothing", async () => {
  const [entry] = buildRouteTable(
    [
      {
        resource: article,
        adapter: createInMemoryAdapter(articleRecords),
        permissions: "open" as const,
      },
    ],
    "",
  );
  const ctx = (url: string) => ({
    entry: entry!,
    actor: { tenant: "one", role: "viewer" },
    request: new Request(url),
    url: new URL(url),
    maxBodyBytes: 1_048_576,
  });

  const list = await handleList(ctx("https://x/article?include=relationships"));
  assert.deepEqual((await list.json()).meta.relationships, {});

  const find = await handleFind(
    ctx("https://x/article/p1?include=relationships"),
    "p1",
  );
  assert.deepEqual((await find.json()).meta, { relationships: {} });
});
