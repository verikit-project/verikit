import assert from "node:assert/strict";
import test from "node:test";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  VerikitError,
} from "../../src/errors/index.js";

test("VerikitError carries its message, code, status, and optional details", () => {
  const error = new VerikitError("Something specific.", "SOMETHING", 418, {
    hint: "teapot",
  });

  assert.equal(error.message, "Something specific.");
  assert.equal(error.name, "VerikitError");
  assert.equal(error.code, "SOMETHING");
  assert.equal(error.status, 418);
  assert.deepEqual(error.details, { hint: "teapot" });
  assert.ok(error instanceof Error);
});

test("VerikitError leaves details undefined when none are given", () => {
  const error = new VerikitError("Plain.", "PLAIN", 500);
  assert.equal(error.details, undefined);
});

test("ValidationError defaults to a 400 VALIDATION_ERROR carrying its issues in details", () => {
  const issues = [{ path: ["email"], message: "Already registered." }];
  const error = new ValidationError("Validation failed.", issues);

  assert.ok(error instanceof VerikitError);
  assert.equal(error.name, "ValidationError");
  assert.equal(error.code, "VALIDATION_ERROR");
  assert.equal(error.status, 400);
  assert.equal(error.message, "Validation failed.");
  assert.deepEqual(error.issues, issues);
  assert.deepEqual(error.details, { issues });
});

test("ValidationError accepts a custom status for routes with their own status convention", () => {
  const error = new ValidationError("Validation failed.", [], 422);
  assert.equal(error.status, 422);
  assert.equal(error.code, "VALIDATION_ERROR");
});

test("ValidationError defaults to an empty message, issues, and 400 status when called with no arguments", () => {
  const error = new ValidationError();
  assert.equal(error.message, "Validation failed.");
  assert.deepEqual(error.issues, []);
  assert.equal(error.status, 400);
});

test("UnauthorizedError is a 401 UNAUTHORIZED with a sensible default message", () => {
  const error = new UnauthorizedError();
  assert.ok(error instanceof VerikitError);
  assert.equal(error.name, "UnauthorizedError");
  assert.equal(error.code, "UNAUTHORIZED");
  assert.equal(error.status, 401);
  assert.equal(error.message, "Authentication required.");
});

test("UnauthorizedError accepts a custom message", () => {
  const error = new UnauthorizedError("Session expired.");
  assert.equal(error.message, "Session expired.");
});

test("ForbiddenError is a 403 FORBIDDEN with a sensible default message", () => {
  const error = new ForbiddenError();
  assert.ok(error instanceof VerikitError);
  assert.equal(error.name, "ForbiddenError");
  assert.equal(error.code, "FORBIDDEN");
  assert.equal(error.status, 403);
  assert.equal(
    error.message,
    "You do not have permission to perform this action.",
  );
});

test("ForbiddenError accepts a custom message", () => {
  const error = new ForbiddenError("Only owners can archive this resource.");
  assert.equal(error.message, "Only owners can archive this resource.");
});

test("NotFoundError is a 404 NOT_FOUND with a sensible default message", () => {
  const error = new NotFoundError();
  assert.ok(error instanceof VerikitError);
  assert.equal(error.name, "NotFoundError");
  assert.equal(error.code, "NOT_FOUND");
  assert.equal(error.status, 404);
  assert.equal(error.message, "Not found.");
});

test("NotFoundError accepts a custom message", () => {
  const error = new NotFoundError('Post "abc" not found.');
  assert.equal(error.message, 'Post "abc" not found.');
});

test("ConflictError is a 409 CONFLICT carrying its message and optional details", () => {
  const error = new ConflictError("Item already reserved.", {
    reservedBy: "user_1",
  });

  assert.ok(error instanceof VerikitError);
  assert.equal(error.name, "ConflictError");
  assert.equal(error.code, "CONFLICT");
  assert.equal(error.status, 409);
  assert.equal(error.message, "Item already reserved.");
  assert.deepEqual(error.details, { reservedBy: "user_1" });
});

test("ConflictError leaves details undefined when none are given", () => {
  const error = new ConflictError("Item already reserved.");
  assert.equal(error.details, undefined);
});
