import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  currentPathname,
  isPlainLeftClick,
  navigate,
  subscribeToLocation,
} from "../../src/routing/location.js";

/** Just enough of `window` for the History API helpers, without a DOM. */
class FakeWindow extends EventTarget {
  location = { pathname: "/" };
  entries = ["/"];
  history = {
    pushState: (_state: unknown, _title: string, url: string) => {
      this.entries.push(url);
      this.location.pathname = url;
    },
    replaceState: (_state: unknown, _title: string, url: string) => {
      this.entries[this.entries.length - 1] = url;
      this.location.pathname = url;
    },
  };
}

let fake: FakeWindow;

before(() => {
  fake = new FakeWindow();
  (globalThis as { window?: unknown }).window = fake;
});

after(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("navigate and subscribeToLocation", () => {
  it("pushes or replaces the URL and notifies subscribers until they unsubscribe", () => {
    let changes = 0;
    const unsubscribe = subscribeToLocation(() => {
      changes += 1;
    });

    navigate("/a");
    assert.equal(currentPathname(), "/a");
    assert.deepEqual(fake.entries, ["/", "/a"]);

    navigate("/b", { replace: true });
    assert.equal(currentPathname(), "/b");
    assert.deepEqual(fake.entries, ["/", "/b"]);

    fake.dispatchEvent(new Event("popstate"));
    assert.equal(changes, 3);

    unsubscribe();
    navigate("/c");
    fake.dispatchEvent(new Event("popstate"));
    assert.equal(changes, 3);
  });
});

describe("isPlainLeftClick", () => {
  const plain = {
    button: 0,
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  };

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
