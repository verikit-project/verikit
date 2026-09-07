import { VerikitError } from "@verikit/core";
import type { HandlerContext } from "./context.js";

/** Protected mutations must use storage-authored revisions, never a client value. */
export async function mutationSnapshot(
  ctx: HandlerContext,
  id: string,
  scope: Record<string, unknown> | undefined,
) {
  const { adapter, permissions } = ctx.entry.config;
  if (permissions === "open") {
    const record = await adapter.find(id, scope);
    return record ? { record, revision: undefined } : undefined;
  }
  if (!adapter.findForMutation) {
    throw new VerikitError(
      "Protected mutations require an adapter configured for conditional writes.",
      "NOT_IMPLEMENTED",
      501,
    );
  }
  return adapter.findForMutation(id, scope);
}
