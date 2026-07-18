import type { FieldSchema } from "@verikit/core";
import type {
  ActionConfirmation,
  ActionPresentation,
} from "../types/action-presentation.js";
import type { ActionResultOptions } from "../execution/action-result.js";

/** Serializable action shape for adapters and layout renderers. */
export interface ActionSchema<TName extends string = string> {
  type: "action";
  name: TName;
  label?: string;
  description?: string;
  icon?: string;
  variant?: ActionPresentation["variant"];
  confirmation?: ActionConfirmation;
  form?: Record<string, FieldSchema>;
  result?: {
    successMessage?: string;
    errorMessage?: string;
  };
  meta?: Record<string, unknown>;
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
