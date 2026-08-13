import { JSDOM } from "jsdom";
import { act } from "react";

/**
 * Installs a minimal jsdom environment on `globalThis` so `react-dom/client`'s `createRoot` can mount into a real container and actually reconcile state updates. Only the small set of interactive tests that need to observe a `useState` functional updater actually run (which a one-shot `renderToStaticMarkup` never triggers) should use this every other test in this package needs no DOM at all. Returns a cleanup function that restores whatever was there before.
 */
export function installJsdom(): () => void {
  const dom = new JSDOM("<!doctype html><body></body>");
  const { window } = dom;

  // jsdom implements neither of these (both are well-known jsdom gaps, not
  // oversights here). Base UI's floating-ui-backed components (Dialog,
  // Select, ...) call them from a layout effect while positioning/mounting
  // their popup, which throws a bare `ReferenceError` there (e.g. `Element
  // is not defined`, from floating-ui's own `instanceof Element` check)
  // when they're missing  no popup content ever reaches the DOM. Minimal
  // stubs are enough: nothing under test asserts on actual resize/media-
  // query behavior, only on the popup content that mounting unblocks.
  class ResizeObserverPolyfill {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  function matchMediaPolyfill(query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }

  const win = window as unknown as Record<string, unknown>;
  win.ResizeObserver = ResizeObserverPolyfill;
  win.matchMedia = matchMediaPolyfill;

  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    Text: window.Text,
    Event: window.Event,
    // floating-ui's `isOverflowElement` calls this as a bare global too.
    getComputedStyle: window.getComputedStyle.bind(window),
    ResizeObserver: ResizeObserverPolyfill,
    matchMedia: matchMediaPolyfill,
    // Node has no browser event loop, so a real rAF/cAF pair would never
    // fire; a setTimeout-based stand-in is enough for code that only needs
    // "runs on a later tick", not real frame timing.
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
    cancelAnimationFrame: (handle: number) => clearTimeout(handle),
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

/**
 * Simulates typing into a controlled input/textarea by invoking React's own
 * `onChange` handler directly (wrapped in `act()`), instead of dispatching a
 * real `input` event.
 *
 * A real dispatched event doesn't work in this test environment: `react-dom`
 * decides once, at module-evaluation time, whether the native `input` event
 * is "supported" (`isInputEventSupported`, cached in a module-scope
 * variable). That check runs the first time anything imports `react-dom`
 * before any test file's `before()` hook has called `installJsdom()`, so
 * there's no `document` yet at all  and permanently caches `false`. Every
 * dispatched `input` event then falls back to a legacy IE `attachEvent`-based
 * polyfill path that jsdom doesn't implement (it throws
 * `activeElement.attachEvent is not a function`). Reaching the real
 * `onChange` closure via the `__reactProps$*` key React stamps onto the DOM
 * node sidesteps that broken path entirely  it's the same closure a
 * "supported" `input` event would have called.
 */
export function typeIntoInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const key = Object.keys(input).find((prop) =>
    prop.startsWith("__reactProps$"),
  );
  const props = key
    ? (input as unknown as Record<string, unknown>)[key]
    : undefined;
  const onChange = (
    props as { onChange?: (event: unknown) => void } | undefined
  )?.onChange;

  if (!onChange) {
    throw new Error("typeIntoInput: no React onChange handler found.");
  }

  act(() => {
    onChange({
      currentTarget: { value },
      nativeEvent: { defaultPrevented: false },
    });
  });
}
