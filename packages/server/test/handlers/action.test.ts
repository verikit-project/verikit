import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions, text } from "@verikit/core";
import { action, type ActionBuilder } from "@verikit/runtime";
import { handleAction } from "../../src/handlers/action.js";
import { buildRouteTable } from "../../src/routing/route-table.js";
import {
  createInMemoryAdapter,
  createPostResource,
  type Post,
} from "../fixtures.js";

interface Actor {
  role: "admin" | "viewer";
}

// Erased the same way `ServerResourceConfig.actions` is: these fixtures build
// actions of differing form/record/result shapes to share one array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate type erasure, see comment above
type AnyAction = ActionBuilder<string, any, any, any, any>;

function ctxFor(
  adapter: ReturnType<typeof createInMemoryAdapter>,
  actions: AnyAction[],
  body: unknown,
  actor: Actor = { role: "viewer" },
) {
  const [entry] = buildRouteTable(
    [{ resource: createPostResource(), adapter, actions }],
    "",
  );
  const request = new Request("https://x/post/actions/publish", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { entry: entry!, actor, request, url: new URL(request.url) };
}

const post: Post = { id: "1", title: "Hello", body: "world", published: false };

test("handleAction runs the named action and returns 200 with its result", async () => {
  const publish = action("publish").execute(() => "published");
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], {}),
    "publish",
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data, "published");
});

test("handleAction returns 404 for an unregistered action name", async () => {
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [], {}),
    "missing",
  );
  assert.equal(response.status, 404);
});

test("handleAction returns 400 for an invalid JSON body", async () => {
  const publish = action("publish").execute(() => "published");
  const [entry] = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        actions: [publish],
      },
    ],
    "",
  );
  const request = new Request("https://x/post/actions/publish", {
    method: "POST",
    body: "{not json",
  });
  const response = await handleAction(
    {
      entry: entry!,
      actor: { role: "viewer" } as Actor,
      request,
      url: new URL(request.url),
    },
    "publish",
  );
  assert.equal(response.status, 400);
});

test("handleAction looks up recordId via the adapter and passes it through", async () => {
  const adapter = createInMemoryAdapter([post]);
  const publish = action("publish").execute(({ record }) => record);

  const response = await handleAction(
    ctxFor(adapter, [publish], { recordId: "1" }),
    "publish",
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, post);
});

test("handleAction returns 404 when recordId doesn't resolve to a record", async () => {
  const publish = action("publish").execute(() => "ok");
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], { recordId: "missing" }),
    "publish",
  );
  assert.equal(response.status, 404);
});

test("handleAction maps a forbidden ActionRunResult to 403", async () => {
  const permissions = definePermissions<Actor>().action(
    "publish",
    ({ actor }) => actor.role === "admin",
  );
  const publish = action("publish")
    .permissions(permissions)
    .execute(() => "ok");

  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], {}),
    "publish",
  );
  assert.equal(response.status, 403);
});

test("handleAction maps a confirmation-required ActionRunResult to 409", async () => {
  const publish = action("publish")
    .confirmation("Are you sure?")
    .execute(() => "ok");
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], {}),
    "publish",
  );
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.error.confirmationRequired, true);
});

test("handleAction confirmed:true bypasses the confirmation gate", async () => {
  const publish = action("publish")
    .confirmation("Are you sure?")
    .execute(() => "ok");
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], { confirmed: true }),
    "publish",
  );
  assert.equal(response.status, 200);
});

test("handleAction maps an unavailable ActionRunResult to 422", async () => {
  const publish = action("publish")
    .availableWhen(() => ({ available: false, reason: "Already published." }))
    .execute(() => "ok");
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], {}),
    "publish",
  );
  assert.equal(response.status, 422);
});

test("handleAction maps a form-validation ActionRunResult to 422 with issues", async () => {
  const publish = action("publish")
    .form({ note: text().required() })
    .execute(() => "ok");
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], {}),
    "publish",
  );
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.ok(Array.isArray(body.error.issues));
});

test("handleAction maps an execution error to 500", async () => {
  const publish = action("publish").execute((): string => {
    throw new Error("boom");
  });
  const response = await handleAction(
    ctxFor(createInMemoryAdapter(), [publish], {}),
    "publish",
  );
  assert.equal(response.status, 500);
});
