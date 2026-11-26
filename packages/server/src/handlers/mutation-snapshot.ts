import { VerikitError } from "@verikit/core";
import type { HandlerContext } from "./context.js";

/** Protected mutations must use storage-authored revisions, never a client value. */
export async function mutationSnapshot(
  ctx: HandlerContext,
  id: string,
  scope: Record<string, unknown> | undefined,
) {
  const { adapter, permissions, resource } = ctx.entry.config;
  if (permissions === "open") {
    const record = await adapter.find(id, scope);
    return record ? { record, revision: undefined } : undefined;
  }
  if (!adapter.findForMutation) {
    throw new VerikitError(
      `Updating or deleting "${resource.name}" requires conditional writes, because it has permissions. Add a revision column to its table (Drizzle detects a column named "revision" automatically) or set the adapter's versionColumn/versionField.`,
      "NOT_IMPLEMENTED",
      501,
    );
  }
  return adapter.findForMutation(id, scope);
}
