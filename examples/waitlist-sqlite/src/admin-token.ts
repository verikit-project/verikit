import { useSyncExternalStore } from "react";
import type { PanelSession } from "verikit/react-panel";

// The admin token is kept in localStorage so a reload stays signed in. A
// real app would use its auth library's session instead.
const STORAGE_KEY = "waitlist-admin-token";
const listeners = new Set<() => void>();

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let token = readStoredToken();

export function setAdminToken(next: string | null): void {
  token = next;

  try {
    if (next) {
      localStorage.setItem(STORAGE_KEY, next);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode); the token still lasts until reload.
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdminToken(): string | null {
  return useSyncExternalStore(subscribe, () => token);
}

/** The panel's `auth.useSession` hook. */
export function useAdminSession(): PanelSession<{ name: string }> {
  return useAdminToken()
    ? {
        status: "authenticated",
        user: { name: "Admin" },
        signOut: () => setAdminToken(null),
      }
    : { status: "unauthenticated" };
}
