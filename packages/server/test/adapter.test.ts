import assert from "node:assert/strict";
import test from "node:test";
import { text } from "@verikit/core";
import { UniqueConstraintError, uniqueConstraintIssues } from "../src/adapter.js";

test("UniqueConstraintError carries the offending field names", () => {
  const error = new UniqueConstraintError(["email", "username"]);
  assert.deepEqual(error.fields, ["email", "username"]);
  assert.match(error.message, /email, username/);
});

test("uniqueConstraintIssues falls back to a generic message naming the field", () => {
  const fields = { email: text().required().toSchema("email") };
  const issues = uniqueConstraintIssues(
    new UniqueConstraintError(["email"]),
    fields,
  );

  assert.deepEqual(issues, [
    { path: ["email"], message: "A record with this email already exists." },
  ]);
});

test("uniqueConstraintIssues prefers a field's label over its name in the generic message", () => {
  const fields = {
    email: text().required().label("Email address").toSchema("email"),
  };
  const issues = uniqueConstraintIssues(
    new UniqueConstraintError(["email"]),
    fields,
  );

  assert.deepEqual(issues, [
    {
      path: ["email"],
      message: "A record with this Email address already exists.",
    },
  ]);
});

test("uniqueConstraintIssues uses a field's uniqueMessage when set", () => {
  const fields = {
    email: text()
      .required()
      .unique("That email is already registered.")
      .toSchema("email"),
  };
  const issues = uniqueConstraintIssues(
    new UniqueConstraintError(["email"]),
    fields,
  );

  assert.deepEqual(issues, [
    { path: ["email"], message: "That email is already registered." },
  ]);
});

test("uniqueConstraintIssues builds one issue per named field", () => {
  const fields = {
    email: text().required().toSchema("email"),
    username: text().required().toSchema("username"),
  };
  const issues = uniqueConstraintIssues(
    new UniqueConstraintError(["email", "username"]),
    fields,
  );

  assert.deepEqual(issues, [
    { path: ["email"], message: "A record with this email already exists." },
    {
      path: ["username"],
      message: "A record with this username already exists.",
    },
  ]);
});
