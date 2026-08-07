import assert from "node:assert/strict";
import test from "node:test";
import { action } from "@verikit/runtime";
import {
  buildRouteTable,
  resolveRoute,
} from "../../src/routing/route-table.js";
import { createInMemoryAdapter, createPostResource } from "../fixtures.js";

test("buildRouteTable defaults each resource's route to its name", () => {
  const table = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
    ],
    "",
  );

  assert.deepEqual(table[0]?.baseSegments, ["post"]);
});

test("buildRouteTable honors a custom path override", () => {
  const table = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        path: "posts",
        permissions: "open",
      },
    ],
    "",
  );

  assert.deepEqual(table[0]?.baseSegments, ["posts"]);
});

test("buildRouteTable prepends basePath to every resource", () => {
  const table = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
    ],
    "/api",
  );

  assert.deepEqual(table[0]?.baseSegments, ["api", "post"]);
});

test("buildRouteTable throws on two resources resolving to the same route", () => {
  assert.throws(
    () =>
      buildRouteTable(
        [
          {
            resource: createPostResource(),
            adapter: createInMemoryAdapter(),
            permissions: "open",
          },
          {
            resource: createPostResource(),
            adapter: createInMemoryAdapter(),
            permissions: "open",
          },
        ],
        "",
      ),
    /Duplicate resource route "\/post"/,
  );
});

test("buildRouteTable throws on two actions sharing a name on one resource", () => {
  assert.throws(
    () =>
      buildRouteTable(
        [
          {
            resource: createPostResource(),
            adapter: createInMemoryAdapter(),
            actions: [action("publish"), action("publish")],
            permissions: "open",
          },
        ],
        "",
      ),
    /duplicate action "publish"/,
  );
});

test("buildRouteTable sorts longer base paths before shorter ones", () => {
  const table = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        path: "shop",
        permissions: "open",
      },
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        path: "shop/featured",
        permissions: "open",
      },
    ],
    "",
  );

  assert.deepEqual(
    table.map((entry) => entry.baseSegments),
    [["shop", "featured"], ["shop"]],
  );
});

test("resolveRoute matches the longest base first so a nested path isn't swallowed", () => {
  const table = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        path: "shop",
        permissions: "open",
      },
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        path: "shop/featured",
        permissions: "open",
      },
    ],
    "",
  );

  const nested = resolveRoute(table, "/shop/featured/5", "GET");
  assert.deepEqual(nested?.entry.baseSegments, ["shop", "featured"]);
  assert.deepEqual(nested?.resolution, {
    status: "matched",
    action: { kind: "find", id: "5" },
  });

  const flat = resolveRoute(table, "/shop/5", "GET");
  assert.deepEqual(flat?.entry.baseSegments, ["shop"]);
});

test("resolveRoute returns undefined when no resource's base matches", () => {
  const table = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        permissions: "open",
      },
    ],
    "",
  );

  assert.equal(resolveRoute(table, "/users", "GET"), undefined);
});
