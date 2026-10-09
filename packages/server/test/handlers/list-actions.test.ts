import assert from "node:assert/strict";
import test from "node:test";
import {
  boolean,
  definePermissions,
  defineResource,
  text,
} from "@verikit/core";
import { action } from "@verikit/runtime";
import {
  createServer,
  type ServerErrorRoute,
} from "../../src/create-server.js";
import { createInMemoryAdapter, type Post } from "../fixtures.js";

interface Actor {
  role: "admin" | "viewer";
}

const feature = action("feature").label("Feature");
const publish = action("publish").label("Publish");
const archive = action("archive").label("Archive");
const reindex = action("reindex").label("Reindex").scope("collection");
const purge = action("purge").label("Purge").scope("collection");

const posts: Post[] = [
  { id: "1", title: "Hello", body: "", published: true },
  { id: "2", title: "World", body: "", published: false },
];

function createHandler(
  onError?: (error: unknown, request: Request, route: ServerErrorRoute) => void,
) {
  const permissions = definePermissions<Actor, Post>()
    .can("list", true)
    .can("read", true)
    // Search only covers fields with a static read rule.
    .field("title", { read: true })
    .action("feature", true)
    .action("publish", true)
    .action("reindex", true)
    .action("purge", ({ actor }) => actor.role === "admin");

  return createServer({
    context: () => ({ role: "viewer" }) as Actor,
    onError,
    resources: [
      {
        resource: defineResource("post", {
          fields: {
            title: text().required().searchable(),
            published: boolean(),
          },
          // `archive` is declared without a handler, so it has no route.
          actions: [feature, publish, archive, reindex, purge],
        }),
        adapter: createInMemoryAdapter(posts),
        handlers: [
          feature
            .permissions(
              definePermissions<Actor, Post>().action(
                "feature",
                ({ record }) => ({
                  allowed: record?.id !== "2",
                  reason: "Not yours to feature.",
                }),
              ),
            )
            .execute(() => "featured"),
          publish
            .availableWhen<Actor, Post>(({ record }) =>
              record?.published
                ? { available: false, reason: "Already published." }
                : true,
            )
            .execute(() => "published"),
          reindex
            .availableWhen<Actor>(() => {
              throw new Error("Index offline.");
            })
            .execute(() => "reindexed"),
          purge.availableWhen<Actor>(() => true).execute(() => "purged"),
        ],
        permissions: permissions as unknown as ReturnType<
          typeof definePermissions<Actor>
        >,
      },
    ],
  });
}

test("a list without include=actions has no meta.actions", async () => {
  const response = await createHandler()(new Request("https://x/post"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.meta, { total: 2, page: 1, pageSize: 25 });
});

test("include=actions lists, per record and for the collection, only the actions the actor can't run", async () => {
  const errors: { error: unknown; route: ServerErrorRoute }[] = [];
  const handler = createHandler((error, _request, route) =>
    errors.push({ error, route }),
  );

  const response = await handler(new Request("https://x/post?include=actions"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 2);
  assert.deepEqual(body.meta.actions, {
    records: {
      "1": {
        publish: { reason: "unavailable", message: "Already published." },
      },
      // The denial's reason stays on the server.
      "2": { feature: { reason: "forbidden" } },
    },
    collection: {
      // A guard that throws fails closed and reaches onError.
      reindex: { reason: "forbidden" },
      purge: { reason: "forbidden" },
    },
  });
  assert.equal(errors.length, 1);
  assert.match((errors[0]!.error as Error).message, /Index offline\./);
  assert.deepEqual(errors[0]!.route, {
    resource: "post",
    action: { kind: "list" },
  });
});

test("the search route also accepts include=actions", async () => {
  const response = await createHandler()(
    new Request("https://x/post/search?q=World&include=actions"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.meta.actions.records, {
    "2": { feature: { reason: "forbidden" } },
  });
});

test("an unknown include value is rejected", async () => {
  const response = await createHandler()(
    new Request("https://x/post?include=actions,authors"),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("include=actions keys numeric ids as strings, skips records without an id or with nothing to report, and omits a missing guard message", async () => {
  const archive = action("archive").label("Archive");
  const handler = createServer({
    resources: [
      {
        resource: defineResource("post", {
          fields: { title: text() },
          actions: [archive],
        }),
        // Adapters should always return an id; a record without one can't
        // be targeted by an action, so it's left out rather than guessed at.
        adapter: createInMemoryAdapter([
          { id: 7, title: "Numeric" },
          { id: "8", title: "Open" },
          { title: "No id" },
        ] as unknown as Post[]),
        handlers: [
          archive
            .availableWhen<unknown, { title: string }>(
              ({ record }) => record?.title === "Open",
            )
            .execute(() => "done"),
        ],
        permissions: "open",
      },
    ],
  });

  const response = await handler(new Request("https://x/post?include=actions"));
  const body = await response.json();

  assert.deepEqual(body.meta.actions, {
    records: { "7": { archive: { reason: "unavailable" } } },
    collection: {},
  });
});

test("find with include=actions reports only the record-scoped actions the actor can't run on that record", async () => {
  const handler = createHandler();

  const published = await (
    await handler(new Request("https://x/post/1?include=actions"))
  ).json();
  assert.equal(published.data.id, "1");
  assert.deepEqual(published.meta, {
    actions: {
      publish: { reason: "unavailable", message: "Already published." },
    },
  });

  const draft = await (
    await handler(new Request("https://x/post/2?include=actions"))
  ).json();
  // Collection-scoped actions (reindex, purge) never appear on a record.
  assert.deepEqual(draft.meta, {
    actions: { feature: { reason: "forbidden" } },
  });
});

test("find without include=actions has no meta, and an unknown include is rejected", async () => {
  const handler = createHandler();

  const plain = await (await handler(new Request("https://x/post/1"))).json();
  assert.equal(plain.meta, undefined);

  const invalid = await handler(
    new Request("https://x/post/1?include=authors"),
  );
  assert.equal(invalid.status, 400);
});
