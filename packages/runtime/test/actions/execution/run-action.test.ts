import assert from "node:assert/strict";
import test from "node:test";
import { number, text } from "@verikit/core";
import { action } from "../../../src/actions/builders/index.js";
import { runAction } from "../../../src/actions/execution/index.js";
import type { InferActionInput } from "../../../src/actions/types/index.js";

test("runAction returns unavailable before validation or execution", async () => {
  let executed = false;
  const archive = action("archive")
    .availableWhen(() => ({ available: false, reason: "Already archived" }))
    .form({ reason: text().required() })
    .execute(() => {
      executed = true;
      return "archived";
    });

  assert.deepEqual(await runAction(archive, { context: {} }), {
    success: false,
    reason: "unavailable",
    message: "Already archived",
  });
  assert.equal(executed, false);
});

test("runAction validates optional form input before execution", async () => {
  const promote = action("promote")
    .form({ rank: number().required().min(1) })
    .execute(({ input }) => input.rank);

  assert.deepEqual(
    await runAction(promote, { context: {}, input: { rank: 0 } }),
    {
      success: false,
      reason: "validation",
      issues: [{ path: ["rank"], message: "Must be at least 1." }],
    },
  );
});

test("runAction executes handlers with validated input and returns result messages", async () => {
  const publish = action("publish")
    .form({
      title: text()
        .required()
        .validation({ parse: (value: unknown) => String(value).trim() }),
    })
    .execute(({ input }) => input.title.toUpperCase())
    .result({ successMessage: (result) => `Published ${result}` });

  const input: InferActionInput<typeof publish> = { title: "  notes  " };
  const result = await runAction(publish, { context: {}, input });

  assert.deepEqual(result, {
    success: true,
    result: "NOTES",
    message: "Published NOTES",
  });
});

test("runAction calls hooks around execution and reports execution failures", async () => {
  const calls: string[] = [];
  const failure = new Error("nope");
  const destroy = action("destroy")
    .execute(() => {
      calls.push("execute");
      throw failure;
    })
    .result({ errorMessage: (error) => (error as Error).message })
    .hooks({
      before: () => {
        calls.push("before");
      },
      after: () => {
        calls.push("after");
      },
      error: () => {
        calls.push("error");
      },
    });

  assert.deepEqual(await runAction(destroy, { context: {} }), {
    success: false,
    reason: "execution",
    error: failure,
    message: "nope",
  });
  assert.deepEqual(calls, ["before", "execute", "error"]);
});
