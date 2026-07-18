import type { ActionRunContext } from "../execution/action-context.js";
import type { ActionResultOptions } from "../execution/action-result.js";
import type { ActionSchema } from "../schema/action-schema.js";
import { schemaResultMessages } from "../schema/action-schema.js";
import type { ActionFormMap, InferActionForm } from "../types/action-form.js";
import type { ActionHandler } from "../types/action-handler.js";
import type { ActionHooks } from "../types/action-hooks.js";
import type {
  ActionConfirmation,
  ActionPresentation,
} from "../types/action-presentation.js";
import type { ActionAvailabilityResult } from "../utils/availability.js";

export interface ActionState<TContext, TRecord, TInput, TResult> {
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
  getRuntime(): ActionState<
    TContext,
    TRecord,
    InferActionForm<TForm>,
    TResult
  > {
    return this.state;
  }
}

/** Creates a runtime action builder. */
export function action<const TName extends string>(
  name: TName,
): ActionBuilder<TName> {
  return new ActionBuilder(name);
}
