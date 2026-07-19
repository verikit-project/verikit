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

/** Context passed to availability guards before form input is validated. */
export interface ActionAvailabilityContext<
  TContext = unknown,
  TRecord = unknown,
> {
  context: TContext;
  record?: TRecord;
  input?: Record<string, unknown>;
}

/** Request passed to `runAction()`. */
export interface ActionRunRequest<TContext, TRecord> {
  context: TContext;
  record?: TRecord;
  input?: Record<string, unknown>;
}
