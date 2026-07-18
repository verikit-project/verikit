import type { ActionRunContext } from "../execution/action-context.js";

/** Function that performs the action's side effect. */
export type ActionHandler<TContext, TRecord, TInput, TResult> = (
  run: ActionRunContext<TContext, TRecord, TInput>,
) => TResult | Promise<TResult>;
