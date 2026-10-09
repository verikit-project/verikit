import assert from "node:assert/strict";
import test from "node:test";
import { formatFieldValue } from "../../src/index.js";

test("formatFieldValue renders empty, date, boolean, and other values as text", () => {
  const date = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));

  assert.equal(formatFieldValue(null), "");
  assert.equal(formatFieldValue(undefined), "");
  assert.equal(formatFieldValue(date), date.toLocaleString());
  assert.equal(formatFieldValue(true), "Yes");
  assert.equal(formatFieldValue(false), "No");
  assert.equal(formatFieldValue(42), "42");
  assert.equal(formatFieldValue("Hello"), "Hello");
});
