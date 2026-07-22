import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions, number, text } from "@verikit/core";
import { action } from "../../../src/actions/builders/index.js";
import { runAction } from "../../../src/actions/execution/index.js";
import type { InferActionInput } from "../../../src/actions/types/index.js";

interface Actor {
  role: "admin" | "viewer";
}

test("runAction returns forbidden before availability, validation, or execution", async () => {
  let executed = false;
  const permissions = definePermissions<Actor>().action(
    "archive",
    ({ actor }) => actor.role === "admin",
  );
  const archive = action("archive")
    .permissions(permissions)
    .availableWhen(() => true)
    .execute(() => {
      executed = true;
      return "archived";
    });

  assert.deepEqual(
    await runAction(archive, { context: { role: "viewer" } as Actor }),
    { success: false, reason: "forbidden", message: undefined },
  );
  assert.equal(executed, false);
});

test("runAction surfaces the denying permission rule's reason", async () => {
  const permissions = definePermissions<Actor>().action("archive", () => ({
    allowed: false,
    reason: "Only admins may archive.",
  }));
  const archive = action("archive")
    .permissions(permissions)
    .execute(() => "archived");

  assert.deepEqual(
    await runAction(archive, { context: { role: "viewer" } as Actor }),
    {
      success: false,
      reason: "forbidden",
      message: "Only admins may archive.",
    },
  );
});

test("runAction reports thrown permission errors as execution failures", async () => {
  const failure = new Error("permission backend failed");
  const archive = action("archive")
    .permissions(
      definePermissions<Actor>().action("archive", () => {
        throw failure;
      }),
    )
    .result({ errorMessage: (error) => (error as Error).message })
    .execute(() => "archived");

  assert.deepEqual(
    await runAction(archive, { context: { role: "admin" } as Actor }),
    {
      success: false,
      reason: "execution",
      error: failure,
      message: "permission backend failed",
    },
  );
});

test("runAction denies execution when permissions omit the action rule", async () => {
  let executed = false;
  const permissions = definePermissions<Actor>().action("publish", true);
  const archive = action("archive")
    .permissions(permissions)
    .execute(() => {
      executed = true;
      return "archived";
    });

  assert.deepEqual(
    await runAction(archive, { context: { role: "admin" } as Actor }),
    { success: false, reason: "forbidden", message: undefined },
  );
  assert.equal(executed, false);
});

test("runAction proceeds normally once the permission check allows the action", async () => {
  const permissions = definePermissions<Actor>().action(
    "archive",
    ({ actor }) => actor.role === "admin",
  );
  const archive = action("archive")
    .permissions(permissions)
    .execute(() => "archived");

  assert.deepEqual(
    await runAction(archive, { context: { role: "admin" } as Actor }),
    {
      success: true,
      result: "archived",
      message: undefined,
    },
  );
});

test("runAction requires explicit confirmation before availability, validation, or execution", async () => {
  let availableChecked = false;
  let executed = false;
  const destroy = action("destroy")
    .confirmation("Delete this record?")
    .availableWhen(() => {
      availableChecked = true;
      return true;
    })
    .form({ reason: text().required() })
    .execute(() => {
      executed = true;
      return "destroyed";
    });

  assert.deepEqual(await runAction(destroy, { context: {} }), {
    success: false,
    reason: "confirmation",
    message: "Delete this record?",
  });
  assert.equal(availableChecked, false);
  assert.equal(executed, false);
});

test("runAction executes confirmed actions", async () => {
  const destroy = action("destroy")
    .confirmation({ message: "Delete this record?", confirmLabel: "Delete" })
    .execute(() => "destroyed");

  assert.deepEqual(await runAction(destroy, { context: {}, confirmed: true }), {
    success: true,
    result: "destroyed",
    message: undefined,
  });
});

test("runAction skips the permission check entirely when none is attached", async () => {
  const archive = action("archive").execute(() => "archived");

  assert.deepEqual(await runAction(archive, { context: {} }), {
    success: true,
    result: "archived",
    message: undefined,
  });
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

test("runAction reports thrown availability errors as execution failures", async () => {
  const failure = new Error("availability backend failed");
  const archive = action("archive")
    .availableWhen(() => {
      throw failure;
    })
    .result({ errorMessage: (error) => (error as Error).message })
    .execute(() => "archived");

  assert.deepEqual(await runAction(archive, { context: {} }), {
    success: false,
    reason: "execution",
    error: failure,
    message: "availability backend failed",
  });
});

test("availability receives raw input before form validation", async () => {
  let seenInput: Record<string, unknown> | undefined;
  let executed = false;

  const promote = action("promote")
    .form({ rank: number().required().min(1) })
    .availableWhen(({ input }) => {
      seenInput = input;
      return input?.rank === "blocked"
        ? { available: false, reason: "Blocked rank" }
        : true;
    })
    .execute(() => {
      executed = true;
      return "promoted";
    });

  assert.deepEqual(
    await runAction(promote, {
      context: {},
      input: { rank: "blocked" },
    }),
    {
      success: false,
      reason: "unavailable",
      message: "Blocked rank",
    },
  );
  assert.deepEqual(seenInput, { rank: "blocked" });
  assert.equal(executed, false);
});

test("availability input is typed as raw while handler input is typed as validated", () => {
  action("typed")
    .form({ rank: number().required() })
    .availableWhen(({ input }) => {
      const rawInput: Record<string, unknown> | undefined = input;
      // @ts-expect-error availability runs before validation, so input is not inferred form data.
      const validatedInput: { rank: number } | undefined = input;

      return rawInput !== validatedInput;
    })
    .execute(({ input }) => {
      const validatedInput: { rank: number } = input;

      return validatedInput.rank;
    });
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

test("runAction reports form schema construction errors as execution failures", async () => {
  const failure = new Error("invalid form field");
  const badField = {
    toSchema: () => {
      throw failure;
    },
  };
  const archive = action("archive")
    .form({ reason: badField as never })
    .result({ errorMessage: (error) => (error as Error).message })
    .execute(() => "archived");

  assert.deepEqual(await runAction(archive, { context: {} }), {
    success: false,
    reason: "execution",
    error: failure,
    message: "invalid form field",
  });
});

test("runAction reports missing handlers as execution failures", async () => {
  const calls: string[] = [];
  const archive = action("archive")
    .result({ errorMessage: (error) => (error as Error).message })
    .hooks({
      error: () => {
        calls.push("error");
      },
    });

  const result = await runAction(archive, { context: {} });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.reason, "execution");
    assert.ok(result.error instanceof Error);
    assert.equal(
      result.message,
      'Action "archive" cannot run without a handler.',
    );
  }
  assert.deepEqual(calls, ["error"]);
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
