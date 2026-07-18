import type { ActionRunContext } from "../execution/action-context.js";

/** Hook callbacks around action execution. */
export interface ActionHooks<TContext, TRecord, TInput, TResult> {
  before?(
    run: ActionRunContext<TContext, TRecord, TInput>,
  ): void | Promise<void>;
  after?(
    run: ActionRunContext<TContext, TRecord, TInput>,
    result: TResult,
  ): void | Promise<void>;
  error?(
    run: ActionRunContext<TContext, TRecord, TInput>,
    error: unknown,
  ): void | Promise<void>;
}
