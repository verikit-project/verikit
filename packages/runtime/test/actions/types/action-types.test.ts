import assert from "node:assert/strict";
import test from "node:test";
import { text } from "@verikit/core";
import { action } from "../../../src/actions/builders/index.js";
import type {
  ActionConfirmation,
  ActionHandler,
  ActionHooks,
  ActionIdentity,
  ActionPresentation,
  ActionRunContext,
  ActionRunRequest,
  ActionRunResult,
  InferActionInput,
} from "../../../src/actions/index.js";

interface Actor {
  id: string;
}

interface RecordShape {
  id: string;
}

test("action type barrel exposes action execution and presentation types", () => {
  const identity: ActionIdentity<"publish"> = { name: "publish" };
  const presentation: ActionPresentation = {
    label: "Publish",
    description: "Make visible",
    icon: "send",
    variant: "primary",
    meta: { placement: "toolbar" },
  };
  const confirmation: ActionConfirmation = {
    title: "Publish",
    message: "Publish now?",
    confirmLabel: "Publish",
    cancelLabel: "Cancel",
  };
  const request: ActionRunRequest<Actor, RecordShape> = {
    context: { id: "u1" },
    record: { id: "r1" },
    input: { note: "ready" },
    confirmed: true,
  };
  const run: ActionRunContext<Actor, RecordShape, { note: string }> = {
    context: request.context,
    record: request.record,
    input: { note: "ready" },
  };
  const success: ActionRunResult<string> = {
    success: true,
    result: "published",
  };
  const failure: ActionRunResult<string> = {
    success: false,
    reason: "confirmation",
    message: confirmation.message,
  };

  assert.equal(identity.name, "publish");
  assert.equal(presentation.variant, "primary");
  assert.equal(run.input.note, "ready");
  assert.equal(success.success, true);
  assert.equal(failure.success, false);
});

test("action type barrel exposes handler, hook, and inferred input types", async () => {
  const _publish = action("publish").form({
    note: text().required(),
  });
  const input: InferActionInput<typeof _publish> = { note: "ready" };
  const calls: string[] = [];
  const handler: ActionHandler<Actor, RecordShape, typeof input, string> = ({
    input: handlerInput,
  }) => handlerInput.note.toUpperCase();
  const hooks: ActionHooks<Actor, RecordShape, typeof input, string> = {
    before: () => {
      calls.push("before");
    },
    after: (_run, result) => {
      calls.push(result);
    },
    error: (_run, error) => {
      calls.push(String(error));
    },
  };
  const run: ActionRunContext<Actor, RecordShape, typeof input> = {
    context: { id: "u1" },
    record: { id: "r1" },
    input,
  };

  await hooks.before?.(run);
  const result = await handler(run);
  await hooks.after?.(run, result);

  assert.equal(result, "READY");
  assert.deepEqual(calls, ["before", "READY"]);
});
