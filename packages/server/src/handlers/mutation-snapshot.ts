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
  const { adapter, permissions, unsafeUnconditionalWrites } = ctx.entry.config;
  if (permissions !== "open" && adapter.findForMutation) {
    return adapter.findForMutation(id, scope);
  }
  if (permissions !== "open" && unsafeUnconditionalWrites !== true) {
    throw new VerikitError(
      "Protected mutations require an adapter configured for conditional writes, or unsafeUnconditionalWrites on the resource.",
      "NOT_IMPLEMENTED",
      501,
    );
  }
  const record = await adapter.find(id, scope);
  return record ? { record, revision: undefined } : undefined;
}
