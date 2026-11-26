import type { ActionSchemaLike } from "@verikit/core";
import type { ActionResultOptions } from "../execution/action-result.js";

/**
 * Serializable action shape for adapters and layout renderers. Structurally identical to `@verikit/core`'s `ActionSchemaLike`, so it travels through `Resource.toSchema()` unchanged.
 */
export interface ActionSchema<
  TName extends string = string,
> extends ActionSchemaLike {
  name: TName;
}

export function schemaResultMessages<TResult>(
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
