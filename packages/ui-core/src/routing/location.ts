/** Fired on `window` after a panel changes the URL itself. */
const NAVIGATE_EVENT = "verikit:navigate";

/** Changes the URL with the History API and tells mounted panels to re-render. */
export function navigate(
  to: string,
  options: { replace?: boolean } = {},
): void {
  if (options.replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
  }

  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/**
 * Calls `onChange` when the URL changes, through back/forward or
 * {@link navigate}. Returns a function that stops listening. Framework
 * bindings pair it with {@link currentPathname}.
 */
export function subscribeToLocation(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);

  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

/** The current `location.pathname`. */
export function currentPathname(): string {
  return window.location.pathname;
}

/** True for a click the browser would otherwise handle as "open here". */
export function isPlainLeftClick(event: {
  button: number;
  defaultPrevented: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
