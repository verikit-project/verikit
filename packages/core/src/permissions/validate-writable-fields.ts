import { FieldSchema } from "../fields/base.js";
import { ValidationIssue, ValidationResult } from "../types/validation.js";
import { validateFieldAsync } from "../validation/validate-field.js";
import { shouldValidateField } from "../validation/validate-resource.js";
import { checkFieldAccess } from "./evaluate-permissions.js";
import { PermissionContext } from "./permission.js";
import { PermissionsBuilder } from "./permissions-builder.js";

function defaultDeniedMessage(field: string): string {
  return `You do not have permission to write to "${field}".`;
}

/**
 * Validates values against a resource's field schemas the
 *  same way `validateResourceAsync` does,
 * but first checks write access for each field via `checkFieldAccess`. A field the actor cannot write to is reported as a single validation issue (using the denying rule's `reason` if it provided one) instead of being run through its normal constraint and attached-validator checks being unwritable takes precedence over whether the given value would otherwise be valid.
 */
export async function validateWritableFields<TActor, TRecord>(
  fields: Record<string, FieldSchema>,
  values: Record<string, unknown>,
  permissions: PermissionsBuilder<TActor, TRecord>,
  context: PermissionContext<TActor, TRecord>,
): Promise<ValidationResult<Record<string, unknown>>> {
  const runtime = permissions.getRuntime();

  const entries = await Promise.all(
    Object.entries(fields)
      .filter(([name, schema]) => shouldValidateField(name, schema, values))
      .map(async ([name, schema]): Promise<[string, ValidationResult]> => {
        const access = await checkFieldAccess(runtime, name, "write", context);

        if (!access.allowed) {
          return [
            name,
            {
              success: false,
              issues: [
                {
                  path: [],
                  message: access.reason ?? defaultDeniedMessage(name),
                },
              ],
            },
          ];
        }

        return [name, await validateFieldAsync(schema, values[name])];
      }),
  );

  const issues: ValidationIssue[] = [];
  const result: Record<string, unknown> = {};

  for (const [name, fieldResult] of entries) {
    if (fieldResult.success) {
      result[name] = fieldResult.value;
    } else {
      for (const fieldIssue of fieldResult.issues) {
        issues.push({
          path: [name, ...fieldIssue.path],
          message: fieldIssue.message,
        });
      }
    }
  }

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, value: result };
}
