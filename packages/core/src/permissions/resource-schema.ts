import { FieldSchema } from "../fields/base.js";
import { ResourceSchema, SchemaNode } from "../resource/resource.js";
import { checkFieldAccess } from "./evaluate-permissions.js";
import { PermissionContext } from "./permission.js";
import { PermissionsBuilder } from "./permissions-builder.js";

function resolveTreeNode(
  node: SchemaNode,
  resolvedFields: Record<string, FieldSchema>,
): SchemaNode {
  switch (node.type) {
    case "field": {
      const resolved = resolvedFields[node.name];
      return resolved ? (resolved as SchemaNode) : node;
    }

    case "section":
    case "grid":
    case "repeater":
      return {
        ...node,
        children: node.children.map((child) =>
          resolveTreeNode(child, resolvedFields),
        ),
      };

    case "tabs":
      return {
        ...node,
        tabs: node.tabs.map((tab) => ({
          ...tab,
          children: tab.children.map((child) =>
            resolveTreeNode(child, resolvedFields),
          ),
        })),
      };

    case "wizard":
      return {
        ...node,
        steps: node.steps.map((step) => ({
          ...step,
          children: step.children.map((child) =>
            resolveTreeNode(child, resolvedFields),
          ),
        })),
      };

    case "action":
      return node.input
        ? {
            ...node,
            input: node.input.map((child) =>
              resolveTreeNode(child, resolvedFields),
            ),
          }
        : node;

    default:
      // Relationship nodes are not gated by field-level permissions.
      return node;
  }
}

/**
 * Resolves a resource schema for a specific actor: fields the actor cannot
 * read are marked `hidden`, and fields the actor cannot write are marked
 * `readOnly`, layered on top of whatever those flags were already set to.
 * Layout tree nodes referencing those fields are updated to match, so
 * adapters can render directly from either `fields` or `tree` and see the
 * same access decisions.
 *
 * Does not mutate the input schema. Relationships are left untouched —
 * `PermissionsBuilder` only gates named fields and actions.
 */
export async function resolveResourceSchema<TActor, TRecord>(
  schema: ResourceSchema,
  permissions: PermissionsBuilder<TActor, TRecord>,
  context: PermissionContext<TActor, TRecord>,
): Promise<ResourceSchema> {
  const resolvedFields: Record<string, FieldSchema> = {};

  await Promise.all(
    Object.entries(schema.fields).map(async ([name, field]) => {
      const [read, write] = await Promise.all([
        checkFieldAccess(permissions, name, "read", context),
        checkFieldAccess(permissions, name, "write", context),
      ]);

      resolvedFields[name] = {
        ...field,
        hidden: read.allowed ? field.hidden : true,
        readOnly: write.allowed ? field.readOnly : true,
      };
    }),
  );

  return {
    ...schema,
    fields: resolvedFields as ResourceSchema["fields"],
    tree: schema.tree.map((node) => resolveTreeNode(node, resolvedFields)),
  };
}
