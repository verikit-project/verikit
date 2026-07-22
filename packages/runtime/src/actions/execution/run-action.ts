import { checkAction, validateResourceAsync } from "@verikit/core";
import type { ActionBuilder } from "../builders/action-builder.js";
import type { ActionFormMap, InferActionForm } from "../types/action-form.js";
import { normalizeAvailability } from "../utils/availability.js";
import { messageFrom } from "../utils/messages.js";
import type { ActionRunRequest } from "./action-context.js";
import type { ActionRunResult } from "./action-result.js";

/**
 * Runs an action, including a permissions check, availability checks, form
 * validation, lifecycle hooks, and execution.
 *
 * Any error thrown by the `before` hook, action handler, or `after`
 * hook causes the action to fail. The optional `error` hook is then
 * invoked. Errors thrown by the `error` hook are ignored so they do
 * not mask the original execution failure.
 */
export async function runAction<
  TName extends string,
  TForm extends ActionFormMap,
  TContext,
  TRecord,
  TResult,
>(
  action: ActionBuilder<TName, TForm, TContext, TRecord, TResult>,
  request: ActionRunRequest<TContext, TRecord>,
): Promise<ActionRunResult<TResult>> {
  const runtime = action.getRuntime();

  if (runtime.permissions) {
    const permission = await checkAction(runtime.permissions, action.name, {
      actor: request.context,
      record: request.record,
    });

    if (!permission.allowed) {
      return {
        success: false,
        reason: "forbidden",
        message: permission.reason,
      };
    }
  }

  const availability = runtime.isAvailable
    ? normalizeAvailability(
        await runtime.isAvailable({
          context: request.context,
          record: request.record,
          input: request.input,
        }),
      )
    : { available: true };

  if (!availability.available) {
    return {
      success: false,
      reason: "unavailable",
      message: availability.reason,
    };
  }

  const inputResult = runtime.form
    ? await validateResourceAsync(
        Object.fromEntries(
          Object.entries(runtime.form).map(([name, field]) => [
            name,
            field.toSchema(name),
          ]),
        ),
        request.input ?? {},
      )
    : { success: true as const, value: {} };

  if (!inputResult.success) {
    return {
      success: false,
      reason: "validation",
      issues: inputResult.issues,
    };
  }

  if (!runtime.handler) {
    throw new Error(`Action "${action.name}" cannot run without a handler.`);
  }

  const run = {
    context: request.context,
    record: request.record,
    input: inputResult.value as InferActionForm<TForm>,
  };

  try {
    await runtime.hooks?.before?.(run);
    const result = await runtime.handler(run);
    await runtime.hooks?.after?.(run, result);

    return {
      success: true,
      result,
      message: messageFrom(runtime.result?.successMessage, result),
    };
  } catch (error) {
    try {
      await runtime.hooks?.error?.(run, error);
    } catch {
      // Ignore errors from the error hook so they don't
      // mask the original execution failure.
    }

    return {
      success: false,
      reason: "execution",
      error,
      message: messageFrom(runtime.result?.errorMessage, error),
    };
  }
}
