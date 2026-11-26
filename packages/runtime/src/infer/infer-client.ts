import type { AnyActionBuilder, InferResource, Resource } from "@verikit/core";
import type { ActionBuilder } from "../actions/builders/action-builder.js";
import type {
  ActionFormMap,
  InferActionForm,
} from "../actions/types/action-form.js";

/** Flattens an intersection into one object type for readable hovers and exact comparisons. */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Mutable request shape: keys whose value may be `undefined` become optional. */
type ClientInputShape<T> = Simplify<
  {
    -readonly [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  } & {
    -readonly [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
  }
>;

/** Input a client sends for an action: its inferred form values, or `undefined` when it declares no form. */
type ClientActionInput<TForm extends ActionFormMap> = [keyof TForm] extends [
  never,
]
  ? undefined
  : ClientInputShape<InferActionForm<TForm>>;

/**
 * Converts one action declaration into `@verikit/client`'s `ActionDefinition` shape: `input` from its `.form()`, `result` from `.returns<T>()` (or `.execute()`), `unknown` when neither is declared.
 */
export type InferClientAction<TAction> =
  TAction extends ActionBuilder<
    string,
    infer TForm,
    infer _TContext,
    infer _TRecord,
    infer TResult
  >
    ? { input?: ClientActionInput<TForm>; result: TResult }
    : never;

/**
 * Maps a resource's declared actions (from `defineResource({ actions })`) to `@verikit/client`'s `ResourceDefinition["actions"]`, keyed by action name.
 */
export type InferClientActions<TResource> =
  TResource extends Resource<
    string,
    infer _TFields,
    infer _TTable,
    infer _TRelationships,
    infer TActions extends readonly AnyActionBuilder[]
  >
    ? {
        [
          TAction in TActions[number] as TAction["name"]
        ]: InferClientAction<TAction>;
      }
    : never;

/**
 * Infers a `@verikit/client` `ResourceDefinition` from a resource: `record` from its fields and relationships, `actions` from its declarations. Intersect `record` with an id or other server-computed fields as needed, e.g. `InferClientResource<typeof posts> & { record: { id: string } }`.
 */
export type InferClientResource<TResource> = {
  record: InferResource<TResource>;
  actions: InferClientActions<TResource>;
};
