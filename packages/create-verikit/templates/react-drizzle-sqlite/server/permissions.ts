import type { ServerResourceConfig } from "@verikit/server";
import type { ResourceName } from "../resources/index.ts";

// Every resource needs an entry here; TypeScript reports any that are
// missing. "open" skips permission checks. Replace it with
// definePermissions() from @verikit/core, and add a `context` option in
// server/app.ts that reads the signed-in user from the request.
export const permissions: Record<
  ResourceName,
  ServerResourceConfig["permissions"]
> = {
  post: "open",
};
