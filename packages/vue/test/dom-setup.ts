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

  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    Element: window.Element,
    Node: window.Node,
    Text: window.Text,
    Event: window.Event,
    getComputedStyle: window.getComputedStyle.bind(window),
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
