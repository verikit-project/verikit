import { createContext, useContext } from "react";
import type { PanelResourceEntry } from "./resources.js";

/** What `usePanel()` returns inside a `<Panel>`. */
export interface PanelContextValue<TUser = unknown> {
  /** Normalized mount path: `""` at the site root, otherwise e.g. `"/admin"`. */
  basePath: string;
  resources: readonly PanelResourceEntry[];
  /** The signed-in user, or `undefined` when the panel has no `auth`. */
  user: TUser | undefined;
  /** Signs the user out, when `auth.useSession()` provided a `signOut`. */
  signOut: (() => void | Promise<void>) | undefined;
  /** Navigates within the panel without a full page load. */
  navigate: (to: string, options?: { replace?: boolean }) => void;
  /** URLs for the panel's built-in pages. */
  href: {
    home: () => string;
    list: (resource: PanelResourceEntry) => string;
    create: (resource: PanelResourceEntry) => string;
    view: (resource: PanelResourceEntry, id: string) => string;
    edit: (resource: PanelResourceEntry, id: string) => string;
  };
}

export const PanelContext = createContext<PanelContextValue | undefined>(
  undefined,
);

/**
 * Reads the nearest `<Panel>`: its resources, URLs, navigation, and the
 * signed-in user. Use it in a dashboard or other custom panel content.
 */
export function usePanel<TUser = unknown>(): PanelContextValue<TUser> {
  const value = useContext(PanelContext);

  if (!value) {
    throw new Error("usePanel must be used within a <Panel>.");
  }

  return value as PanelContextValue<TUser>;
}
