import type { FieldSchema } from "./base.js";

/**
 * Where a field applies across the create, update, and response surfaces of
 * a resource's API, derived from its existing schema flags.
 */
export interface FieldApplicability {
  /** Field may appear in a create request body. */
  create: boolean;
  /** Field may appear in an update request body. */
  update: boolean;
  /** Field may appear in a response body. */
  response: boolean;
}

/**
 * Derives create/update/response applicability from a field's existing
 * `readOnly` and `hidden` flags, without adding new schema state.
 */
export function fieldApplicability(field: FieldSchema): FieldApplicability {
  return {
    create: field.readOnly !== true,
    update: field.readOnly !== true,
    response: field.hidden !== true,
  };
}
