import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defineResource, text } from "@verikit/core";
import { normalizePanelResources, pluralize } from "../src/resources.js";

const fields = { name: text() };

describe("pluralize", () => {
  it("handles common English endings", () => {
    assert.equal(pluralize("post"), "posts");
    assert.equal(pluralize("category"), "categories");
    assert.equal(pluralize("day"), "days");
    assert.equal(pluralize("box"), "boxes");
    assert.equal(pluralize("church"), "churches");
    assert.equal(pluralize("address"), "addresses");
    assert.equal(pluralize("posts"), "posts");
  });
});

describe("normalizePanelResources", () => {
  it("derives labels and paths from the resource name", () => {
    const [entry] = normalizePanelResources([
      defineResource("blogPost", { fields }),
    ]);

    assert.equal(entry.label, "Blog posts");
    assert.equal(entry.singularLabel, "Blog post");
    assert.equal(entry.path, "blog-posts");
    assert.equal(entry.icon, undefined);
    assert.equal(entry.group, undefined);
  });

  it("accepts a resource schema and snake_case names", () => {
    const [entry] = normalizePanelResources([
      defineResource("order_item", { fields }).toSchema(),
    ]);

    assert.equal(entry.label, "Order items");
    assert.equal(entry.path, "order-items");
  });

  it("uses configured settings", () => {
    const resource = defineResource("person", { fields });
    const Icon = () => null;
    const [entry] = normalizePanelResources([
      {
        resource,
        label: "People",
        singularLabel: "Person",
        path: "people",
        icon: Icon,
        group: "Users",
      },
    ]);

    assert.deepEqual(entry, {
      resource,
      label: "People",
      singularLabel: "Person",
      path: "people",
      icon: Icon,
      group: "Users",
      recordClick: "view",
    });
  });

  it("takes recordClick from the resource, else the panel default, else view", () => {
    const resource = defineResource("person", { fields });
    const other = defineResource("place", { fields });

    assert.deepEqual(
      normalizePanelResources([resource]).map((entry) => entry.recordClick),
      ["view"],
    );
    assert.deepEqual(
      normalizePanelResources([{ resource, recordClick: "view" }, other], {
        recordClick: "edit",
      }).map((entry) => entry.recordClick),
      ["view", "edit"],
    );
  });

  it("falls back for a name with no letters", () => {
    const [entry] = normalizePanelResources([defineResource("__", { fields })]);

    assert.equal(entry.path, "s");
  });

  it("rejects invalid and duplicate paths", () => {
    const resource = defineResource("post", { fields });

    assert.throws(
      () => normalizePanelResources([{ resource, path: "" }]),
      /invalid path ""/,
    );
    assert.throws(
      () => normalizePanelResources([{ resource, path: "a/b" }]),
      /invalid path "a\/b"/,
    );
    assert.throws(
      () => normalizePanelResources([resource, { resource, label: "Again" }]),
      /two resources use the path "posts"/,
    );
  });
});
