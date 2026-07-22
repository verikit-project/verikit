import assert from "node:assert/strict";
import test from "node:test";
import {
  messageFrom,
  normalizeAvailability,
} from "../../../src/actions/utils/index.js";

test("normalizeAvailability widens boolean shorthand results", () => {
  assert.deepEqual(normalizeAvailability(true), { available: true });
  assert.deepEqual(normalizeAvailability(false), { available: false });
});

test("normalizeAvailability passes object results through", () => {
  const unavailable = { available: false, reason: "Already archived" };

  assert.equal(normalizeAvailability(unavailable), unavailable);
});

test("messageFrom resolves undefined, string, and function messages", () => {
  assert.equal(messageFrom(undefined, "saved"), undefined);
  assert.equal(messageFrom("Saved", "saved"), "Saved");
  assert.equal(
    messageFrom((value: string) => value.toUpperCase(), "saved"),
    "SAVED",
  );
});
