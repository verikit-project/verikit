import assert from "node:assert/strict";
import test from "node:test";
import { schemaResultMessages } from "../../../src/actions/schema/index.js";

test("schemaResultMessages returns undefined without result metadata", () => {
  assert.equal(schemaResultMessages(undefined), undefined);
});

test("schemaResultMessages keeps string messages for adapter schemas", () => {
  assert.deepEqual(
    schemaResultMessages({
      successMessage: "Saved",
      errorMessage: "Could not save",
    }),
    {
      successMessage: "Saved",
      errorMessage: "Could not save",
    },
  );
});

test("schemaResultMessages omits function messages from adapter schemas", () => {
  assert.deepEqual(
    schemaResultMessages({
      successMessage: (result: unknown) => `Saved ${String(result)}`,
      errorMessage: (error: unknown) => String(error),
    }),
    {
      successMessage: undefined,
      errorMessage: undefined,
    },
  );
});
