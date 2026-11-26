import { VerikitError } from "@verikit/core";
import type { HandlerContext } from "./context.js";

/**
 * Protected mutations must use storage-authored revisions, never a client value. A resource that sets `unsafeUnconditionalWrites` skips the revision when its adapter has none.
 */
export async function mutationSnapshot(
  ctx: HandlerContext,
  id: string,
  scope: Record<string, unknown> | undefined,
) {
  const { adapter, permissions, resource, unsafeUnconditionalWrites } =
    ctx.entry.config;
  if (permissions !== "open" && adapter.findForMutation) {
    return adapter.findForMutation(id, scope);
  }
  if (permissions !== "open" && unsafeUnconditionalWrites !== true) {
    throw new VerikitError(
      `Updating or deleting "${resource.name}" requires conditional writes, because it has permissions. Add a revision column to its table (Drizzle detects a column named "revision" automatically), set the adapter's versionColumn/versionField, or set unsafeUnconditionalWrites on the resource.`,
      "NOT_IMPLEMENTED",
      501,
    );
  }
  const record = await adapter.find(id, scope);
  return record ? { record, revision: undefined } : undefined;
}
