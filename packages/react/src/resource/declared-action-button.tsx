import type { ReactElement } from "react";
import { Button } from "#components/button";
import type { UnavailableAction } from "@verikit/client";
import type { ActionSchemaLike } from "@verikit/core";
import { actionLabel } from "@verikit/ui-core/actions/resource-actions";

/**
 * A declared action's button. Hidden when the server reports the actor may not run it; disabled, with the reason as a tooltip, when it can't run right now.
 */
export function DeclaredActionButton({
  action,
  unavailable,
  variant,
  disabled,
  onClick,
}: {
  action: ActionSchemaLike;
  unavailable: UnavailableAction | undefined;
  variant: "destructive" | "ghost" | "outline";
  disabled: boolean;
  onClick: () => void;
}): ReactElement | null {
  if (unavailable?.reason === "forbidden") {
    return null;
  }

  const button = (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={disabled || unavailable !== undefined}
      onClick={onClick}
    >
      {actionLabel(action)}
    </Button>
  );

  // Disabled buttons ignore pointer events, so the tooltip sits on a wrapper.
  return unavailable ? (
    <span className="inline-flex" title={unavailable.message}>
      {button}
    </span>
  ) : (
    button
  );
}
