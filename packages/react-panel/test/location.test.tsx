import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { usePanel } from "../src/context.js";
import { PanelLink } from "../src/link.js";
import {
  isPlainLeftClick,
  navigate,
  usePathname,
} from "../src/routing/location.js";
import { installJsdom } from "./dom.js";

let uninstall: () => void;

before(() => {
  uninstall = installJsdom();
});

after(() => uninstall());

function Pathname() {
  return <span>{usePathname()}</span>;
}

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));

  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
      window.history.replaceState(null, "", "/");
    },
  };
}

const plain = {
  button: 0,
  defaultPrevented: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

describe("isPlainLeftClick", () => {
  it("is true only for an unmodified, unhandled left click", () => {
    assert.equal(isPlainLeftClick(plain), true);
    assert.equal(isPlainLeftClick({ ...plain, button: 1 }), false);
    assert.equal(isPlainLeftClick({ ...plain, defaultPrevented: true }), false);
    assert.equal(isPlainLeftClick({ ...plain, metaKey: true }), false);
    assert.equal(isPlainLeftClick({ ...plain, ctrlKey: true }), false);
    assert.equal(isPlainLeftClick({ ...plain, shiftKey: true }), false);
    assert.equal(isPlainLeftClick({ ...plain, altKey: true }), false);
  });
});

describe("navigate and usePathname", () => {
  it("re-renders on push, replace, and back/forward", () => {
    const view = mount(<Pathname />);
    assert.equal(view.container.textContent, "/");

    act(() => navigate("/a"));
    assert.equal(view.container.textContent, "/a");
    assert.equal(window.history.length, 2);

    act(() => navigate("/b", { replace: true }));
    assert.equal(view.container.textContent, "/b");
    assert.equal(window.history.length, 2);

    act(() => {
      window.history.pushState(null, "", "/c");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    assert.equal(view.container.textContent, "/c");

    view.unmount();
  });

  it('renders "/" on the server', () => {
    assert.equal(renderToString(<Pathname />), "<span>/</span>");
  });
});

describe("PanelLink", () => {
  it("navigates on a plain click and leaves modified clicks to the browser", () => {
    const clicks: string[] = [];
    const view = mount(
      <PanelLink to="/posts" onClick={() => clicks.push("click")}>
        Posts
      </PanelLink>,
    );
    const anchor = view.container.querySelector("a")!;
    assert.equal(anchor.getAttribute("href"), "/posts");

    const modified = new window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    // Stop jsdom from following the link itself.
    window.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    act(() => {
      anchor.dispatchEvent(modified);
    });
    assert.equal(window.location.pathname, "/");

    act(() => anchor.click());
    assert.equal(window.location.pathname, "/posts");
    assert.deepEqual(clicks, ["click", "click"]);

    view.unmount();
  });
});

describe("usePanel", () => {
  it("throws outside a Panel", () => {
    function Reader() {
      usePanel();
      return null;
    }

    assert.throws(() => renderToString(<Reader />), /within a <Panel>/);
  });
});
