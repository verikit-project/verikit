import assert from "node:assert/strict";
import test from "node:test";
import {
  ConflictError,
  definePermissions,
  text,
  type ValidationError,
} from "@verikit/core";
import { action, type ActionBuilder } from "@verikit/runtime";
import { handleAction } from "../../src/handlers/action.js";
import { buildRouteTable } from "../../src/routing/route-table.js";
import {
  createInMemoryAdapter,
  createPostResource,
  verikitError,
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
  permissions?: ReturnType<typeof definePermissions<Actor>>,
) {
  const [entry] = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter,
        actions,
        permissions: permissions ?? "open",
      },
    ],
    "",
  );
  const request = new Request("https://x/post/actions/publish", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    entry: entry!,
    actor,
    request,
    url: new URL(request.url),
    maxBodyBytes: 1_048_576,
  };
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

test("handleAction throws a 404 NotFoundError for an unregistered action name", async () => {
  await assert.rejects(
    handleAction(ctxFor(createInMemoryAdapter(), [], {}), "missing"),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleAction throws a 400 ValidationError for an invalid JSON body", async () => {
  const publish = action("publish").execute(() => "published");
  const [entry] = buildRouteTable(
    [
      {
        resource: createPostResource(),
        adapter: createInMemoryAdapter(),
        actions: [publish],
        permissions: "open",
      },
    ],
    "",
  );
  const request = new Request("https://x/post/actions/publish", {
    method: "POST",
    body: "{not json",
  });
  await assert.rejects(
    handleAction(
      {
        entry: entry!,
        actor: { role: "viewer" } as Actor,
        request,
        url: new URL(request.url),
        maxBodyBytes: 1_048_576,
      },
      "publish",
    ),
    verikitError(400, "VALIDATION_ERROR"),
  );
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

test("handleAction throws a 404 NotFoundError when recordId doesn't resolve to a record", async () => {
  const publish = action("publish").execute(() => "ok");
  await assert.rejects(
    handleAction(
      ctxFor(createInMemoryAdapter(), [publish], { recordId: "missing" }),
      "publish",
    ),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleAction throws a 403 ForbiddenError for a forbidden ActionRunResult", async () => {
  const permissions = definePermissions<Actor>().action(
    "publish",
    ({ actor }) => actor.role === "admin",
  );
  const publish = action("publish")
    .permissions(permissions)
    .execute(() => "ok");

  await assert.rejects(
    handleAction(ctxFor(createInMemoryAdapter(), [publish], {}), "publish"),
    verikitError(403, "FORBIDDEN"),
  );
});

test("handleAction throws a 404 NotFoundError (not 403) when the action's own permissions deny access to a resolved record, so existence isn't leaked", async () => {
  const permissions = definePermissions<Actor>().action(
    "publish",
    ({ actor }) => actor.role === "admin",
  );
  const publish = action("publish")
    .permissions(permissions)
    .execute(() => "ok");

  await assert.rejects(
    handleAction(
      ctxFor(createInMemoryAdapter([post]), [publish], { recordId: "1" }),
      "publish",
    ),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleAction throws a 404 NotFoundError (not 403) when a resource-level rule denies access to a resolved record, so existence isn't leaked", async () => {
  const permissions = definePermissions<Actor>().action(
    "publish",
    ({ actor }) => actor.role === "admin",
  );
  const publish = action("publish").execute(() => "ok");

  await assert.rejects(
    handleAction(
      ctxFor(
        createInMemoryAdapter([post]),
        [publish],
        { recordId: "1" },
        { role: "viewer" },
        permissions,
      ),
      "publish",
    ),
    verikitError(404, "NOT_FOUND"),
  );
});

test("handleAction throws a 403 ForbiddenError for an action with no resource-level rule once the resource has permissions configured", async () => {
  // Fails closed like `checkResourceOperation`: attaching a permissions builder to the
  // resource gates every action, even ones the builder never mentions via `.action()`
  // and even though the action itself declares no `.permissions()` of its own.
  const permissions = definePermissions<Actor>().can("read", () => true);
  const publish = action("publish").execute(() => "published");

  await assert.rejects(
    handleAction(
      ctxFor(
        createInMemoryAdapter(),
        [publish],
        {},
        { role: "admin" },
        permissions,
      ),
      "publish",
    ),
    verikitError(403, "FORBIDDEN"),
  );
});

test("handleAction enforces a resource-level .action() rule independent of the action's own .permissions()", async () => {
  const permissions = definePermissions<Actor>().action(
    "publish",
    ({ actor }) => actor.role === "admin",
  );
  const publish = action("publish").execute(() => "published");

  await assert.rejects(
    handleAction(
      ctxFor(
        createInMemoryAdapter(),
        [publish],
        {},
        { role: "viewer" },
        permissions,
      ),
      "publish",
    ),
    verikitError(403, "FORBIDDEN"),
  );

  const allowed = await handleAction(
    ctxFor(
      createInMemoryAdapter(),
      [publish],
      {},
      { role: "admin" },
      permissions,
    ),
    "publish",
  );
  assert.equal(allowed.status, 200);
});

test("handleAction throws a 409 VerikitError for a confirmation-required ActionRunResult", async () => {
  const publish = action("publish")
    .confirmation("Are you sure?")
    .execute(() => "ok");

  await assert.rejects(
    handleAction(ctxFor(createInMemoryAdapter(), [publish], {}), "publish"),
    verikitError(409, "CONFIRMATION_REQUIRED", (error) => {
      assert.deepEqual(error.details, { confirmationRequired: true });
    }),
  );
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

test("handleAction throws a 422 VerikitError for an unavailable ActionRunResult", async () => {
  const publish = action("publish")
    .availableWhen(() => ({ available: false, reason: "Already published." }))
    .execute(() => "ok");

  await assert.rejects(
    handleAction(ctxFor(createInMemoryAdapter(), [publish], {}), "publish"),
    verikitError(422, "ACTION_UNAVAILABLE"),
  );
});

test("handleAction throws a 422 ValidationError with issues for a form-validation ActionRunResult", async () => {
  const publish = action("publish")
    .form({ note: text().required() })
    .execute(() => "ok");

  await assert.rejects(
    handleAction(ctxFor(createInMemoryAdapter(), [publish], {}), "publish"),
    verikitError<ValidationError>(422, "VALIDATION_ERROR", (error) => {
      assert.ok(Array.isArray(error.issues));
      assert.ok(error.issues.length > 0);
    }),
  );
});

test("handleAction throws a 500 INTERNAL_ERROR VerikitError for an execution error, with the original error attached as .cause", async () => {
  const boom = new Error("boom");
  const publish = action("publish").execute((): string => {
    throw boom;
  });

  await assert.rejects(
    handleAction(ctxFor(createInMemoryAdapter(), [publish], {}), "publish"),
    verikitError(500, "INTERNAL_ERROR", (error) => {
      assert.equal(error.cause, boom);
    }),
  );
});

test("handleAction rethrows a VerikitError an action handler throws itself verbatim, not flattened to a generic 500", async () => {
  const publish = action("publish").execute((): string => {
    throw new ConflictError("Already reserved.");
  });

  await assert.rejects(
    handleAction(ctxFor(createInMemoryAdapter(), [publish], {}), "publish"),
    verikitError(409, "CONFLICT"),
  );
});
