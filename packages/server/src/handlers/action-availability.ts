import { ValidationError } from "@verikit/core";
import { checkActionAvailability } from "@verikit/runtime";
import type { ServerActionHandler } from "../create-server.js";
import { maybeCheckAction } from "../permissions.js";
import type { HandlerContext } from "./context.js";

/** An action the actor can't run, as reported in a list response's `meta.actions`. */
export type UnavailableAction =
  { reason: "forbidden" } | { reason: "unavailable"; message?: string };

/**
 * The actions the actor can't run on a page of records, sent as `meta.actions` when a list request asks for `include=actions`. Only actions that can't run are listed: `records` is keyed by record id, then action name, for record-scoped actions; `collection` is keyed by action name, for collection-scoped ones.
 */
export interface ListActionAvailability {
  records: Record<string, Record<string, UnavailableAction>>;
  collection: Record<string, UnavailableAction>;
}

/** True when the list request asks for `include=actions`; any other `include` value is rejected. */
export function includesActions(url: URL): boolean {
  const values = url.searchParams
    .getAll("include")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value !== "");

  for (const value of values) {
    if (value !== "actions") {
      throw new ValidationError("Invalid include.", [
        { path: ["include"], message: `Unknown include "${value}".` },
      ]);
    }
  }

  return values.length > 0;
}

/**
 * Runs the same checks `handleAction` does before running an action (the resource's action permission, then the action's own permissions and availability guard) for each executable action: per record for record-scoped ones, once for collection-scoped ones. A check that throws fails closed, reporting the action as forbidden, and passes the error to `onError`.
 */
export async function listActionAvailability(
  ctx: HandlerContext,
  records: readonly Record<string, unknown>[],
): Promise<ListActionAvailability> {
  const recordActions: ServerActionHandler[] = [];
  const collectionActions: ServerActionHandler[] = [];

  for (const action of ctx.entry.actions) {
    if ((action.toSchema().scope ?? "record") === "collection") {
      collectionActions.push(action);
    } else {
      recordActions.push(action);
    }
  }

  const [recordEntries, collectionEntries] = await Promise.all([
    Promise.all(
      records.map(async (record) => {
        const id = record.id;
        if (typeof id !== "string" && typeof id !== "number") {
          return undefined;
        }
        const unavailable = await unavailableActions(
          ctx,
          recordActions,
          record,
        );
        return Object.keys(unavailable).length > 0
          ? ([String(id), unavailable] as const)
          : undefined;
      }),
    ),
    unavailableActions(ctx, collectionActions, undefined),
  ]);

  return {
    records: Object.fromEntries(
      recordEntries.filter((entry) => entry !== undefined),
    ),
    collection: collectionEntries,
  };
}

async function unavailableActions(
  ctx: HandlerContext,
  actions: readonly ServerActionHandler[],
  record: Record<string, unknown> | undefined,
): Promise<Record<string, UnavailableAction>> {
  const results = await Promise.all(
    actions.map(
      async (action) =>
        [action.name, await checkOne(ctx, action, record)] as const,
    ),
  );

  return Object.fromEntries(
    results.filter(
      (entry): entry is readonly [string, UnavailableAction] =>
        entry[1] !== undefined,
    ),
  );
}

async function checkOne(
  ctx: HandlerContext,
  action: ServerActionHandler,
  record: Record<string, unknown> | undefined,
): Promise<UnavailableAction | undefined> {
  try {
    const permission = await maybeCheckAction(
      ctx.entry.config.permissions,
      action.name,
      { actor: ctx.actor, record },
    );

    if (!permission.allowed) {
      return { reason: "forbidden" };
    }

    const result = await checkActionAvailability(action, {
      context: ctx.actor,
      record,
    });

    if (result.available) {
      return undefined;
    }

    // A denial's message is left out: the client only hides the action, and
    // `handleAction` never reveals why a record action was denied either.
    return result.reason === "forbidden"
      ? { reason: "forbidden" }
      : {
          reason: "unavailable",
          ...(result.message !== undefined && { message: result.message }),
        };
  } catch (error) {
    ctx.reportError?.(error);
    return { reason: "forbidden" };
  }
}
