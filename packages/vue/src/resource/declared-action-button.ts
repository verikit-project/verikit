import { h, type VNodeChild } from "vue";
import { Button } from "#components/button";
import type { UnavailableAction } from "@verikit/client";
import type { ActionSchemaLike } from "@verikit/core";
import { actionLabel } from "@verikit/ui-core/actions/resource-actions";

/**
 * Renders a declared action's button. Hidden when the server reports the actor may not run it; disabled, with the reason as a tooltip, when it can't run right now.
 */
export function declaredActionButton(options: {
  action: ActionSchemaLike;
  unavailable: UnavailableAction | undefined;
  variant: "ghost" | "outline";
  disabled: boolean;
  onClick: () => void;
}): VNodeChild {
  const { action, unavailable } = options;

  if (unavailable?.reason === "forbidden") {
    return null;
  }

  const button = h(
    Button,
    {
      key: action.name,
      type: "button",
      variant: action.variant === "danger" ? "destructive" : options.variant,
      size: "sm",
      disabled: options.disabled || unavailable !== undefined,
      onClick: options.onClick,
    },
    { default: () => actionLabel(action) },
  );

  // Disabled buttons ignore pointer events, so the tooltip sits on a wrapper.
  return unavailable
    ? h(
        "span",
        { key: action.name, class: "inline-flex", title: unavailable.message },
        [button],
      )
    : button;
}
