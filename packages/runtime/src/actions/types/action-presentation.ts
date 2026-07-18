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

/** Controls whether the UI should ask before executing the action. */
export interface ActionConfirmation {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}
