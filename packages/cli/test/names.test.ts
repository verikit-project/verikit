import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  camelCase,
  importSpecifier,
  invalidIdentifier,
  kebabCase,
  pluralCamelCase,
  pluralize,
  pluralSnakeCase,
  sentenceCase,
  snakeCase,
  words,
} from "../src/names.js";

describe("case conversion", () => {
  it("splits every naming style into words", () => {
    assert.deepEqual(words("BlogPost"), ["blog", "post"]);
    assert.deepEqual(words("blog-post_item now"), [
      "blog",
      "post",
      "item",
      "now",
    ]);
    assert.deepEqual(words("HTMLParser2Go"), ["html", "parser2", "go"]);
  });

  it("converts between styles", () => {
    assert.equal(camelCase("Blog post"), "blogPost");
    assert.equal(camelCase(""), "");
    assert.equal(kebabCase("blogPost"), "blog-post");
    assert.equal(snakeCase("publishedAt"), "published_at");
    assert.equal(sentenceCase("publishedAt"), "Published at");
    assert.equal(pluralCamelCase("blogPost"), "blogPosts");
    assert.equal(pluralSnakeCase("category"), "categories");
    assert.equal(pluralSnakeCase("__"), "");
  });

  it("pluralizes common endings", () => {
    assert.equal(pluralize("day"), "days");
    assert.equal(pluralize("box"), "boxes");
    assert.equal(pluralize("address"), "addresses");
    assert.equal(pluralize("posts"), "posts");
  });
});

describe("importSpecifier", () => {
  it("prefixes paths that don't start with a dot", () => {
    assert.equal(importSpecifier("../../x.ts"), "../../x.ts");
    assert.equal(importSpecifier("x.ts"), "./x.ts");
    assert.equal(importSpecifier("a\\b.ts"), "./a/b.ts");
  });
});

describe("invalidIdentifier", () => {
  it("accepts camelCase identifiers", () => {
    assert.equal(invalidIdentifier("blogPost2"), undefined);
  });

  it("rejects bad shapes and reserved names", () => {
    assert.match(invalidIdentifier("2fast")!, /start with a letter/);
    assert.match(invalidIdentifier("Post")!, /start with a letter/);
    assert.match(invalidIdentifier("delete")!, /reserved/);
    assert.match(invalidIdentifier("tables", ["tables"])!, /reserved/);
  });
});
