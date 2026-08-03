import { JSDOM } from "jsdom";

/**
 * Installs a minimal jsdom environment on `globalThis` so `react-dom/client`'s
 * `createRoot` can mount into a real container and actually reconcile state
 * updates. Only the small set of interactive tests that need to observe a
 * `useState` functional updater actually run (which a one-shot
 * `renderToStaticMarkup` never triggers) should use this  every other test
 * in this package needs no DOM at all. Returns a cleanup function that
 * restores whatever was there before.
 */
export function installJsdom(): () => void {
  const dom = new JSDOM("<!doctype html><body></body>");
  const { window } = dom;

  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    Text: window.Text,
    Event: window.Event,
    // Tells React's `act()` it's safe to warn/flush synchronously here.
    IS_REACT_ACT_ENVIRONMENT: true,
  };

  // Node itself already defines some of these (e.g. `navigator`) as
  // getter-only globals, so a plain assignment throws; redefine the
  // descriptor instead, and restore the original descriptor afterward.
  const target = globalThis as unknown as Record<string, unknown>;
  const previous = new Map<string, PropertyDescriptor | undefined>();

  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(target, key));
    Object.defineProperty(target, key, {
      value,
      configurable: true,
      writable: true,
    });
  }

  return () => {
    for (const [key, descriptor] of previous) {
      if (descriptor) {
        Object.defineProperty(target, key, descriptor);
      } else {
        delete target[key];
      }
    }
    window.close();
  };
}
