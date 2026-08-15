import { JSDOM } from "jsdom";

/**
 * Installs a minimal jsdom environment on `globalThis` so `@vue/test-utils`'s
 * `mount` can mount into a real container. Vue's reactivity (and TanStack's
 * `useSelector`/`useQuery`/`useMutation` composables) don't need a DOM at
 * all, but `mount`/`provide`/`inject` only wire up correctly across an
 * actual component tree, which requires `document` to exist.
 */
export function installJsdom(): () => void {
  const dom = new JSDOM("<!doctype html><body></body>");
  const { window } = dom;

  // jsdom implements neither of these. Reka UI's floating-ui-backed
  // components (Select, and anything using @floating-ui/vue) call them while
  // positioning/mounting their popup, throwing a bare `ReferenceError` there
  // when they're missing. Minimal stubs are enough: nothing under test
  // asserts on actual resize/media-query behavior.
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
    HTMLInputElement: window.HTMLInputElement,
    HTMLButtonElement: window.HTMLButtonElement,
    HTMLSelectElement: window.HTMLSelectElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    SVGElement: window.SVGElement,
    Element: window.Element,
    Node: window.Node,
    Text: window.Text,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    DocumentFragment: window.DocumentFragment,
    MutationObserver: window.MutationObserver,
    KeyboardEvent: window.KeyboardEvent,
    MouseEvent: window.MouseEvent,
    FocusEvent: window.FocusEvent,
    NodeFilter: window.NodeFilter,
    getComputedStyle: window.getComputedStyle.bind(window),
    ResizeObserver: ResizeObserverPolyfill,
    matchMedia: matchMediaPolyfill,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
    cancelAnimationFrame: (handle: number) => clearTimeout(handle),
  };

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
