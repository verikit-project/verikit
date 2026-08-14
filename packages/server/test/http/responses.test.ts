import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundError, ValidationError } from "@verikit/core";
import {
  dataResponse,
  errorResponse,
  methodNotAllowedResponse,
  noContentResponse,
  notFoundResponse,
  toErrorResponse,
} from "../../src/http/responses.js";

test("dataResponse wraps the payload and defaults to 200", async () => {
  const response = dataResponse({ id: "1" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { id: "1" } });
});

test("dataResponse includes meta and message when provided, and honors status", async () => {
  const response = dataResponse([1, 2], {
    status: 201,
    meta: { total: 2 },
    message: "done",
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: [1, 2],
    meta: { total: 2 },
    message: "done",
  });
});

test("dataResponse defaults null data to a JSON null", async () => {
  const response = dataResponse(null);
  assert.deepEqual(await response.json(), { data: null });
});

test("noContentResponse is a bodyless 204", async () => {
  const response = noContentResponse();
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
});

test("errorResponse wraps code/message/extra under error", async () => {
  const response = errorResponse(400, "SOMETHING", "bad", {
    confirmationRequired: true,
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "SOMETHING",
      message: "bad",
      confirmationRequired: true,
    },
  });
});

test("errorResponse omits extra keys entirely when none are given", async () => {
  const response = errorResponse(404, "NOT_FOUND", "Not found.");
  assert.deepEqual(await response.json(), {
    error: { code: "NOT_FOUND", message: "Not found." },
  });
});

test("toErrorResponse maps a VerikitError's own status/code/message", async () => {
  const response = toErrorResponse(new NotFoundError('Post "1" not found.'));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: "NOT_FOUND", message: 'Post "1" not found.' },
  });
});

test("toErrorResponse spreads a plain-object details onto the error body", async () => {
  const issues = [{ path: ["email"], message: "Already registered." }];
  const response = toErrorResponse(new ValidationError("Validation failed.", issues));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { code: "VALIDATION_ERROR", message: "Validation failed.", issues },
  });
});

test("shorthand error responses use the right status and default message", async () => {
  assert.equal(notFoundResponse().status, 404);
  assert.equal((await notFoundResponse().json()).error.message, "Not found.");
  assert.equal((await notFoundResponse().json()).error.code, "NOT_FOUND");
  assert.equal(methodNotAllowedResponse().status, 405);
  assert.equal(
    (await methodNotAllowedResponse().json()).error.code,
    "METHOD_NOT_ALLOWED",
  );
});
