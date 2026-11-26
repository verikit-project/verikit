import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions } from "@verikit/core";
import { action } from "../../../src/actions/builders/index.js";
import {
  checkActionAvailability,
  runAction,
} from "../../../src/actions/execution/index.js";

interface Actor {
  role: "admin" | "viewer";
}

interface Post {
  status: "draft" | "published";
}

const permissions = definePermissions<Actor>().action("publish", () => ({
  allowed: false,
  reason: "Only admins may publish.",
}));

test("checkActionAvailability reports available when no permissions or guard apply", async () => {
  assert.deepEqual(
    await checkActionAvailability(action("publish"), { context: {} }),
    { available: true },
  );
});

test("checkActionAvailability checks permissions before the guard, without executing", async () => {
  let guardCalls = 0;
  let handlerCalls = 0;
  const publish = action("publish")
    .permissions(permissions)
    .availableWhen(() => {
      guardCalls += 1;
      return true;
    })
    .execute(() => {
      handlerCalls += 1;
    });

  assert.deepEqual(
    await checkActionAvailability(publish, {
      context: { role: "viewer" } as Actor,
    }),
    {
      available: false,
      reason: "forbidden",
      message: "Only admins may publish.",
    },
  );
  assert.equal(guardCalls, 0);
  assert.equal(handlerCalls, 0);
});

test("checkActionAvailability passes the record to the guard and surfaces its reason", async () => {
  const publish = action("publish")
    .availableWhen<Actor, Post>(({ record }) =>
      record?.status === "published"
        ? { available: false, reason: "Already published." }
        : true,
    )
    .confirmation("Publish?");

  assert.deepEqual(
    await checkActionAvailability(publish, {
      context: { role: "admin" } as Actor,
      record: { status: "published" } as Post,
    }),
    {
      available: false,
      reason: "unavailable",
      message: "Already published.",
    },
  );
  // A confirmation doesn't affect availability: it's asked for at run time.
  assert.deepEqual(
    await checkActionAvailability(publish, {
      context: { role: "admin" } as Actor,
      record: { status: "draft" } as Post,
    }),
    { available: true },
  );
});

test("checkActionAvailability lets guard errors propagate", async () => {
  const publish = action("publish").availableWhen(() => {
    throw new Error("Guard failed.");
  });

  await assert.rejects(
    checkActionAvailability(publish, { context: {} }),
    /Guard failed\./,
  );
});

test("runAction reports the same outcome checkActionAvailability does", async () => {
  const publish = action("publish")
    .availableWhen(() => ({ available: false, reason: "Paused." }))
    .execute(() => "published");

  const check = await checkActionAvailability(publish, { context: {} });
  const run = await runAction(publish, { context: {} });

  assert.equal(check.available, false);
  assert.deepEqual(run, {
    success: false,
    reason: "unavailable",
    message: "Paused.",
  });
});
