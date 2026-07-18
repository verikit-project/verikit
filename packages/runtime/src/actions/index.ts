import {
  AnyFieldBuilder,
  FieldSchema,
  InferField,
  validateResourceAsync,
  ValidationIssue,
} from "@verikit/core";

/** Map of action form input names to field builders. */
export type ActionFormMap = Record<string, AnyFieldBuilder>;

/** Extracts the validated input value shape from an action form map. */
export type InferActionForm<TForm extends ActionFormMap> =
  string extends keyof TForm
    ? Record<string, unknown>
    : {
        [K in keyof TForm]: InferField<TForm[K]>;
      };

/** Extracts the validated input value shape from an action builder. */
export type InferActionInput<TAction> =
  TAction extends ActionBuilder<
    string,
    infer TForm,
    infer _TContext,
    infer _TRecord,
    infer _TResult
  >
    ? InferActionForm<TForm>
    : never;

/** Stable identity used to reference an action in layouts and adapters. */
export interface ActionIdentity<TName extends string = string> {
  name: TName;
}

/** Presentation metadata used by UI adapters. */
export interface ActionPresentation {
  label?: string;
  description?: string;
  icon?: string;
  variant?: "primary" | "secondary" | "danger";
  meta?: Record<string, unknown>;
}

/** Availability result returned by guards. */
export type ActionAvailabilityResult =
  | boolean
  | {
      available: boolean;
      reason?: string;
    };

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

/** Controls whether the UI should ask before executing the action. */
export interface ActionConfirmation {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Result presentation metadata used after execution. */
export interface ActionResultOptions<TResult = unknown> {
  successMessage?: string | ((result: TResult) => string);
  errorMessage?: string | ((error: unknown) => string);
}

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

/** Function that performs the action's side effect. */
export type ActionHandler<TContext, TRecord, TInput, TResult> = (
  run: ActionRunContext<TContext, TRecord, TInput>,
) => TResult | Promise<TResult>;

/** Serializable action shape for adapters and layout renderers. */
export interface ActionSchema<TName extends string = string> {
  type: "action";
  name: TName;
  label?: string;
  description?: string;
  icon?: string;
  variant?: "primary" | "secondary" | "danger";
  confirmation?: ActionConfirmation;
  form?: Record<string, FieldSchema>;
  result?: {
    successMessage?: string;
    errorMessage?: string;
  };
  meta?: Record<string, unknown>;
}

interface ActionState<TContext, TRecord, TInput, TResult> {
  presentation: ActionPresentation;
  confirmation?: ActionConfirmation;
  form?: ActionFormMap;
  isAvailable?: (
    run: Omit<ActionRunContext<TContext, TRecord, TInput>, "input"> & {
      input?: TInput;
    },
  ) => ActionAvailabilityResult | Promise<ActionAvailabilityResult>;
  handler?: ActionHandler<TContext, TRecord, TInput, TResult>;
  result?: ActionResultOptions<TResult>;
  hooks?: ActionHooks<TContext, TRecord, TInput, TResult>;
}

/** Successful action run result. */
export interface ActionRunSuccess<TResult> {
  success: true;
  result: TResult;
  message?: string;
}

/** Failed action run result. */
export type ActionRunFailure =
  | {
      success: false;
      reason: "unavailable";
      message?: string;
    }
  | {
      success: false;
      reason: "validation";
      issues: ValidationIssue[];
    }
  | {
      success: false;
      reason: "execution";
      error: unknown;
      message?: string;
    };

/** Result returned by `runAction()`. */
export type ActionRunResult<TResult> =
  ActionRunSuccess<TResult> | ActionRunFailure;

/** Request passed to `runAction()`. */
export interface ActionRunRequest<TContext, TRecord> {
  context: TContext;
  record?: TRecord;
  input?: Record<string, unknown>;
}

function normalizeAvailability(result: ActionAvailabilityResult): {
  available: boolean;
  reason?: string;
} {
  return typeof result === "boolean" ? { available: result } : result;
}

function messageFrom<TValue>(
  message: string | ((value: TValue) => string) | undefined,
  value: TValue,
): string | undefined {
  return typeof message === "function" ? message(value) : message;
}

function schemaResultMessages<TResult>(
  result: ActionResultOptions<TResult> | undefined,
): ActionSchema["result"] {
  if (!result) {
    return undefined;
  }

  return {
    successMessage:
      typeof result.successMessage === "string"
        ? result.successMessage
        : undefined,
    errorMessage:
      typeof result.errorMessage === "string" ? result.errorMessage : undefined,
  };
}

/**
 * Immutable runtime action builder.
 *
 * The builder covers identity, presentation, availability, confirmation,
 * optional form input, execution, result metadata, and lifecycle hooks.
 */
export class ActionBuilder<
  TName extends string,
  TForm extends ActionFormMap = Record<never, never>,
  TContext = unknown,
  TRecord = unknown,
  TResult = unknown,
> {
  readonly name: TName;

  private readonly state: ActionState<
    TContext,
    TRecord,
    InferActionForm<TForm>,
    TResult
  >;

  constructor(
    name: TName,
    state: ActionState<TContext, TRecord, InferActionForm<TForm>, TResult> = {
      presentation: {},
    },
  ) {
    if (name.trim().length === 0) {
      throw new Error("Action names must be non-empty strings.");
    }

    this.name = name;
    this.state = {
      ...state,
      presentation: { ...state.presentation },
      confirmation: state.confirmation ? { ...state.confirmation } : undefined,
      form: state.form ? { ...state.form } : undefined,
      result: state.result ? { ...state.result } : undefined,
      hooks: state.hooks ? { ...state.hooks } : undefined,
    };
  }

  private withState<TNextResult = TResult>(
    patch: Partial<
      ActionState<TContext, TRecord, InferActionForm<TForm>, TNextResult>
    >,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TNextResult> {
    return new ActionBuilder(this.name, {
      ...this.state,
      ...patch,
    } as ActionState<TContext, TRecord, InferActionForm<TForm>, TNextResult>);
  }

  /** Sets the display label. */
  label(
    label: string,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({
      presentation: { ...this.state.presentation, label },
    });
  }

  /** Sets supporting UI copy. */
  description(
    description: string,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({
      presentation: { ...this.state.presentation, description },
    });
  }

  /** Sets an adapter-specific icon name. */
  icon(icon: string): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({
      presentation: { ...this.state.presentation, icon },
    });
  }

  /** Sets the visual intent. */
  variant(
    variant: ActionPresentation["variant"],
  ): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({
      presentation: { ...this.state.presentation, variant },
    });
  }

  /** Merges adapter-specific presentation metadata. */
  meta(
    meta: Record<string, unknown>,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({
      presentation: {
        ...this.state.presentation,
        meta: { ...this.state.presentation.meta, ...meta },
      },
    });
  }

  /** Adds a runtime availability guard. */
  availableWhen<TNextContext = TContext, TNextRecord = TRecord>(
    isAvailable: ActionState<
      TNextContext,
      TNextRecord,
      InferActionForm<TForm>,
      TResult
    >["isAvailable"],
  ): ActionBuilder<TName, TForm, TNextContext, TNextRecord, TResult> {
    return new ActionBuilder(this.name, {
      ...this.state,
      isAvailable,
    } as ActionState<
      TNextContext,
      TNextRecord,
      InferActionForm<TForm>,
      TResult
    >);
  }

  /** Requires confirmation before adapters execute the action. */
  confirmation(
    confirmation: string | ActionConfirmation,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({
      confirmation:
        typeof confirmation === "string"
          ? { message: confirmation }
          : confirmation,
    });
  }

  /** Attaches optional form fields that are validated before execution. */
  form<const TNextForm extends ActionFormMap>(
    form: TNextForm,
  ): ActionBuilder<TName, TNextForm, TContext, TRecord, TResult> {
    return new ActionBuilder(this.name, {
      ...this.state,
      form,
    } as ActionState<TContext, TRecord, InferActionForm<TNextForm>, TResult>);
  }

  /** Attaches the function that performs the action. */
  execute<TNextResult>(
    handler: ActionHandler<
      TContext,
      TRecord,
      InferActionForm<TForm>,
      TNextResult
    >,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TNextResult> {
    return this.withState<TNextResult>({
      handler,
    } as Partial<
      ActionState<TContext, TRecord, InferActionForm<TForm>, TNextResult>
    >);
  }

  /** Sets result presentation metadata. */
  result(
    result: ActionResultOptions<TResult>,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({ result });
  }

  /** Attaches lifecycle hooks around execution. */
  hooks(
    hooks: ActionHooks<TContext, TRecord, InferActionForm<TForm>, TResult>,
  ): ActionBuilder<TName, TForm, TContext, TRecord, TResult> {
    return this.withState({ hooks });
  }

  /** Finalizes the adapter-facing action schema. */
  toSchema(): ActionSchema<TName> {
    const form = this.state.form
      ? Object.fromEntries(
          Object.entries(this.state.form).map(([name, field]) => [
            name,
            field.toSchema(name),
          ]),
        )
      : undefined;

    return {
      type: "action",
      name: this.name,
      label: this.state.presentation.label,
      description: this.state.presentation.description,
      icon: this.state.presentation.icon,
      variant: this.state.presentation.variant,
      confirmation: this.state.confirmation,
      form,
      result: schemaResultMessages(this.state.result),
      meta: this.state.presentation.meta,
    };
  }

  /** @internal Used by `runAction()`. */
  getRuntime() {
    return this.state;
  }
}

/** Creates a runtime action builder. */
export function action<const TName extends string>(
  name: TName,
): ActionBuilder<TName> {
  return new ActionBuilder(name);
}

/** Runs an action, including availability, form validation, execution, and hooks. */
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
  const availability = runtime.isAvailable
    ? normalizeAvailability(
        await runtime.isAvailable({
          context: request.context,
          record: request.record,
          input: request.input as InferActionForm<TForm> | undefined,
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
    await runtime.hooks?.error?.(run, error);

    return {
      success: false,
      reason: "execution",
      error,
      message: messageFrom(runtime.result?.errorMessage, error),
    };
  }
}
