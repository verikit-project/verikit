import { checkAction } from "@verikit/core";
import type { ActionBuilder } from "../builders/action-builder.js";
import type { ActionFormMap } from "../types/action-form.js";
import { normalizeAvailability } from "../utils/availability.js";
import type { ActionRunRequest } from "./action-context.js";

/** Result of `checkActionAvailability()`. */
export type ActionAvailabilityCheck =
  | { available: true }
  | {
      available: false;
      reason: "forbidden" | "unavailable";
      message?: string;
    };

/**
 * Decides whether an action can run for a context and record without running it: the action's permissions, then its availability guard. `runAction()` starts with these same checks, so a UI that shows actions from this result agrees with what running them would do. When called without `input` (as when listing records), the guard sees no input, so a guard that depends on form input should treat a missing value as available. Errors thrown by permissions or the guard propagate to the caller.
 */
export async function checkActionAvailability<
  TName extends string,
  TForm extends ActionFormMap,
  TContext,
  TRecord,
  TResult,
>(
  action: ActionBuilder<TName, TForm, TContext, TRecord, TResult>,
  request: Omit<ActionRunRequest<TContext, TRecord>, "confirmed">,
): Promise<ActionAvailabilityCheck> {
  const runtime = action.getRuntime();

  if (runtime.permissions) {
    const permission = await checkAction(runtime.permissions, action.name, {
      actor: request.context,
      record: request.record,
    });

    if (!permission.allowed) {
      return {
        available: false,
        reason: "forbidden",
        message: permission.reason,
      };
    }
  }

  if (runtime.isAvailable) {
    const availability = normalizeAvailability(
      await runtime.isAvailable({
        context: request.context,
        record: request.record,
        input: request.input,
      }),
    );

    if (!availability.available) {
      return {
        available: false,
        reason: "unavailable",
        message: availability.reason,
      };
    }
  }

  return { available: true };
}
