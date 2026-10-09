import type { ActionSchemaLike, Resource, ResourceSchema } from "@verikit/core";

/** Resource builder or schema whose declared actions a UI renders. */
export type ResourceActionSource = Resource | ResourceSchema;

/** Where an action renders: per record (row) or once for the collection (toolbar). */
export type ResourceActionScope = NonNullable<ActionSchemaLike["scope"]>;

function isResource(source: ResourceActionSource): source is Resource {
  return typeof (source as Resource).toSchema === "function";
}

/**
 * Returns the actions declared on a resource via `defineResource({ actions })`, in declaration order, optionally limited to one scope. Actions without an explicit scope count as `"record"`.
 */
export function resourceActionSchemas(
  source: ResourceActionSource,
  scope?: ResourceActionScope,
): ActionSchemaLike[] {
  const actions = isResource(source)
    ? source.actions.map((declaration) => declaration.toSchema())
    : Object.values(source.actions ?? {});

  return scope
    ? actions.filter((action) => (action.scope ?? "record") === scope)
    : actions;
}

/** True when running an action needs a dialog: a confirmation to accept or form input to collect. */
export function actionNeedsDialog(action: ActionSchemaLike): boolean {
  return (
    action.confirmation !== undefined ||
    Object.keys(action.form ?? {}).length > 0
  );
}

/** Display label for an action, falling back to its name. */
export function actionLabel(action: ActionSchemaLike): string {
  return action.label ?? action.name;
}
