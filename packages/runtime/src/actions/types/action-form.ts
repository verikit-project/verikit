import type { AnyFieldBuilder, InferField } from "@verikit/core";
import type { ActionBuilder } from "../builders/action-builder.js";

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
