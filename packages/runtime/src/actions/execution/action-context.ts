/** Runtime context passed to guards, hooks, and handlers. */
export interface ActionRunContext<
  TContext = unknown,
  TRecord = unknown,
  TInput = unknown,
> {
  context: TContext;
  record?: TRecord;
  input: TInput;
}

/** Request passed to `runAction()`. */
export interface ActionRunRequest<TContext, TRecord> {
  context: TContext;
  record?: TRecord;
  input?: Record<string, unknown>;
}
