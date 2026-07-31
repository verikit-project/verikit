import assert from "node:assert/strict";
import test from "node:test";
import {
  dataResponse,
  errorResponse,
  forbiddenResponse,
  methodNotAllowedResponse,
  noContentResponse,
  notFoundResponse,
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

test("errorResponse wraps message/issues/extra under error", async () => {
  const response = errorResponse(400, "bad", {
    issues: [{ path: [], message: "required" }],
    extra: { confirmationRequired: true },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      message: "bad",
      issues: [{ path: [], message: "required" }],
      confirmationRequired: true,
    },
  });
});

test("shorthand error responses use the right status and default message", async () => {
  assert.equal(notFoundResponse().status, 404);
  assert.equal((await notFoundResponse().json()).error.message, "Not found");
  assert.equal(forbiddenResponse().status, 403);
  assert.equal((await forbiddenResponse().json()).error.message, "Forbidden");
  assert.equal(methodNotAllowedResponse().status, 405);
});
