import assert from "node:assert/strict";
import test from "node:test";
import { number, text } from "@verikit/core";
import { action, runAction, type InferActionInput } from "../../src/index.js";

test("action builder produces a schema for identity, presentation, confirmation, form, and result", () => {
  const publish = action("publish")
    .label("Publish")
    .description("Make the record visible")
    .icon("send")
    .variant("primary")
    .meta({ placement: "toolbar" })
    .confirmation({
      title: "Publish record",
      message: "Publish this record now?",
      confirmLabel: "Publish",
      cancelLabel: "Cancel",
    })
    .form({
      note: text().required(),
    })
    .result({
      successMessage: "Published",
      errorMessage: "Could not publish",
    });

  assert.deepEqual(publish.toSchema(), {
    type: "action",
    name: "publish",
    label: "Publish",
    description: "Make the record visible",
    icon: "send",
    variant: "primary",
    confirmation: {
      title: "Publish record",
      message: "Publish this record now?",
      confirmLabel: "Publish",
      cancelLabel: "Cancel",
    },
    form: {
      note: {
        type: "field",
        name: "note",
        fieldType: "text",
        required: true,
        nullable: false,
      },
    },
    result: {
      successMessage: "Published",
      errorMessage: "Could not publish",
    },
    meta: { placement: "toolbar" },
  });
});

test("action builder methods are immutable", () => {
  const base = action("archive");
  const labelled = base.label("Archive");

  assert.equal(base.toSchema().label, undefined);
  assert.equal(labelled.toSchema().label, "Archive");
});

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
