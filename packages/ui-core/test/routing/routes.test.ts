import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchPanelRoute,
  normalizeBasePath,
  panelHref,
} from "../../src/routing/routes.js";

const paths = new Set(["posts", "blog-posts"]);

describe("normalizeBasePath", () => {
  it("maps the root to an empty string and trims slashes", () => {
    assert.equal(normalizeBasePath("/"), "");
    assert.equal(normalizeBasePath(""), "");
    assert.equal(normalizeBasePath("admin"), "/admin");
    assert.equal(normalizeBasePath("/admin/"), "/admin");
    assert.equal(normalizeBasePath("//a/b//"), "/a/b");
  });
});

describe("matchPanelRoute", () => {
  it("matches every page under a base path", () => {
    assert.deepEqual(matchPanelRoute("/admin", "/admin", paths), {
      kind: "home",
    });
    assert.deepEqual(matchPanelRoute("/admin/", "/admin", paths), {
      kind: "home",
    });
    assert.deepEqual(matchPanelRoute("/admin/posts", "/admin", paths), {
      kind: "list",
      resource: "posts",
    });
    assert.deepEqual(matchPanelRoute("/admin/posts/create", "/admin", paths), {
      kind: "create",
      resource: "posts",
    });
    assert.deepEqual(matchPanelRoute("/admin/posts/a%2Fb", "/admin", paths), {
      kind: "view",
      resource: "posts",
      id: "a/b",
    });
    assert.deepEqual(
      matchPanelRoute("/admin/posts/a%2Fb/edit", "/admin", paths),
      { kind: "edit", resource: "posts", id: "a/b" },
    );
    // "create" is the create page, but a record with that id can still be edited.
    assert.deepEqual(
      matchPanelRoute("/admin/posts/create/edit", "/admin", paths),
      { kind: "edit", resource: "posts", id: "create" },
    );
  });

  it("matches at the site root", () => {
    assert.deepEqual(matchPanelRoute("/", "/", paths), { kind: "home" });
    assert.deepEqual(matchPanelRoute("/blog-posts", "", paths), {
      kind: "list",
      resource: "blog-posts",
    });
  });

  it("returns notFound for anything else", () => {
    for (const pathname of [
      "/other",
      "/administrator",
      "/admin/unknown",
      "/admin/posts/1/view",
      "/admin/posts/1/edit/more",
      "/admin/posts/%E0%A4%A",
    ]) {
      assert.deepEqual(
        matchPanelRoute(pathname, "/admin", paths),
        { kind: "notFound" },
        pathname,
      );
    }
  });
});

describe("panelHref", () => {
  it("builds encoded URLs", () => {
    assert.equal(panelHref("/"), "/");
    assert.equal(panelHref("/admin"), "/admin");
    assert.equal(panelHref("/", "posts"), "/posts");
    assert.equal(
      panelHref("admin/", "posts", "a/b", "edit"),
      "/admin/posts/a%2Fb/edit",
    );
  });
});
