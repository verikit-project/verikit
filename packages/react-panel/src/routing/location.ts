import { useSyncExternalStore } from "react";
import {
  currentPathname,
  subscribeToLocation,
} from "@verikit/ui-core/routing/location";

export { isPlainLeftClick, navigate } from "@verikit/ui-core/routing/location";

function serverPathname(): string {
  return "/";
}

/** The current `location.pathname`, updated on back/forward and panel navigation. */
export function usePathname(): string {
  return useSyncExternalStore(
    subscribeToLocation,
    currentPathname,
    serverPathname,
  );
}
