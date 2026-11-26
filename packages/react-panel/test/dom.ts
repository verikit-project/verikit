import { JSDOM } from "jsdom";
import { act } from "react";

/**
 * Installs jsdom globals, with a real http URL so the History API works.
 * Mirrors `@verikit/react`'s test setup, including the stubs Base UI's
 * Dialog needs. Returns a function that restores the previous globals.
 */
export function installJsdom(): () => void {
  const dom = new JSDOM("<!doctype html><body></body>", {
    url: "http://localhost/",
  });
  const { window } = dom;

  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  const matchMediaStub = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;

  const win = window as unknown as Record<string, unknown>;
  win.ResizeObserver = ResizeObserverStub;
  win.matchMedia = matchMediaStub;

  const globals: Record<string, unknown> = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    Text: window.Text,
    Event: window.Event,
    PopStateEvent: window.PopStateEvent,
    getComputedStyle: window.getComputedStyle.bind(window),
    ResizeObserver: ResizeObserverStub,
    matchMedia: matchMediaStub,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
    cancelAnimationFrame: (handle: number) => clearTimeout(handle),
    IS_REACT_ACT_ENVIRONMENT: true,
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

/**
 * Calls a controlled input's React `onChange` directly. See
 * `@verikit/react`'s `typeIntoInput` for why a dispatched event doesn't work
 * under jsdom here.
 */
export function typeInto(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const key = Object.keys(input).find((prop) =>
    prop.startsWith("__reactProps$"),
  )!;
  const { onChange } = (input as unknown as Record<string, unknown>)[key] as {
    onChange: (event: unknown) => void;
  };

  act(() => {
    onChange({
      currentTarget: { value },
      nativeEvent: { defaultPrevented: false },
    });
  });
}

export async function waitFor(
  predicate: () => boolean,
  timeout = 2000,
): Promise<void> {
  const start = Date.now();

  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error("waitFor: timed out");
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
}

export function text(): string {
  return document.body.textContent ?? "";
}

export function button(label: string): HTMLButtonElement {
  const match = Array.from(document.querySelectorAll("button")).find(
    (candidate) =>
      candidate.textContent === label ||
      candidate.getAttribute("aria-label") === label,
  );

  if (!match) {
    throw new Error(`no button "${label}"`);
  }

  return match as HTMLButtonElement;
}

export function link(label: string): HTMLAnchorElement {
  const match = Array.from(document.querySelectorAll("a")).find(
    (candidate) => candidate.textContent === label,
  );

  if (!match) {
    throw new Error(`no link "${label}"`);
  }

  return match;
}

export function click(element: HTMLElement): void {
  act(() => {
    element.click();
  });
}
