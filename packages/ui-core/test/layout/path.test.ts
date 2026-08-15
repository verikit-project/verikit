import assert from "node:assert/strict";
import test from "node:test";
import {
  getValueAtPath,
  hasValueAtPath,
  pathKey,
  setValueAtPath,
  unsetValueAtPath,
} from "../../src/index.js";

test("getValueAtPath resolves nested paths and pathKey joins them", () => {
  const source = { a: { b: [{ c: 1 }, { c: 2 }] } };

  assert.equal(getValueAtPath(source, ["a", "b", 1, "c"]), 2);
  assert.equal(getValueAtPath(source, ["a", "missing", "c"]), undefined);
  assert.equal(getValueAtPath(null, ["a"]), undefined);
  assert.equal(getValueAtPath(undefined, ["a"]), undefined);
  assert.equal(pathKey(["a", 1, "c"]), "a.1.c");
  assert.equal(pathKey([]), "");
});

test("hasValueAtPath distinguishes an absent key from a value of undefined", () => {
  const source = { a: { b: undefined, c: 1 }, list: [0] };

  assert.equal(hasValueAtPath(source, []), true);
  assert.equal(hasValueAtPath(source, ["a", "b"]), true);
  assert.equal(hasValueAtPath(source, ["a", "missing"]), false);
  assert.equal(hasValueAtPath(source, ["a", "c", "d"]), false);
  assert.equal(hasValueAtPath(null, ["a"]), false);
  assert.equal(hasValueAtPath(source, ["list", 0]), true);
  assert.equal(hasValueAtPath(source, ["list", 1]), false);
});

test("setValueAtPath clones containers along the path without mutating the source", () => {
  const source = { a: { b: [{ c: 1 }, { c: 2 }] } };

  const updated = setValueAtPath(
    source,
    ["a", "b", 1, "c"],
    9,
  ) as typeof source;
  assert.equal(updated.a.b[1]?.c, 9);
  assert.equal(source.a.b[1]?.c, 2);
  assert.notEqual(updated, source);
  assert.equal(updated.a.b[0], source.a.b[0]);

  assert.deepEqual(setValueAtPath(undefined, ["items", 0, "name"], "x"), {
    items: [{ name: "x" }],
  });
  assert.deepEqual(setValueAtPath({ a: 1 }, [], { b: 2 }), { b: 2 });
});

test("unsetValueAtPath removes a key without mutating the source, and is a no-op when there's nothing to remove", () => {
  const source = { a: { b: 1, c: 2 }, items: [{ name: "x" }, { name: "y" }] };

  const updated = unsetValueAtPath(source, ["a", "b"]) as typeof source;
  assert.deepEqual(updated.a, { c: 2 });
  assert.deepEqual(source.a, { b: 1, c: 2 });
  assert.notEqual(updated, source);
  assert.equal(updated.items, source.items);

  // Nested inside an array container (e.g. a readOnly field inside a
  // repeater row): only the targeted row is cloned, its siblings untouched.
  const updatedNested = unsetValueAtPath(source, [
    "items",
    0,
    "name",
  ]) as typeof source;
  assert.deepEqual(updatedNested.items[0], {});
  assert.equal(updatedNested.items[1], source.items[1]);

  // An empty path, a non-object source (including `null`, whose `typeof` is
  // famously `"object"`), and a terminal path segment landing on an array
  // are all no-ops: schema-tree field paths never terminate on an array in
  // practice (a field name is always the last segment), but the function
  // stays a safe no-op rather than corrupting an array by "deleting" an
  // index from it.
  assert.equal(unsetValueAtPath(source, []), source);
  assert.equal(unsetValueAtPath(null, ["a"]), null);
  assert.equal(unsetValueAtPath(42, ["a"]), 42);
  const array = [1, 2, 3];
  assert.equal(unsetValueAtPath(array, ["0"]), array);

  // A missing intermediate container still clones its way down (mirroring
  // `setValueAtPath`'s own permissive style) rather than special-casing the
  // miss; the walk simply has nothing to remove once it gets there.
  assert.deepEqual(unsetValueAtPath({ a: 1 }, ["missing", "b"]), {
    a: 1,
    missing: undefined,
  });
});
