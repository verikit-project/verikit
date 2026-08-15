import assert from "node:assert/strict";
import test from "node:test";

test("ui-core package exposes its public entrypoint", async () => {
  const module = await import("../../src/index.js");

  assert.deepEqual(Object.keys(module).sort(), [
    "firstFieldError",
    "firstFieldErrors",
    "getValueAtPath",
    "hasValueAtPath",
    "inferAndValidateResource",
    "inferAndValidateSchemaTree",
    "isResource",
    "omitFieldError",
    "patchCachedListRecord",
    "pathKey",
    "recordId",
    "removeCachedListRecord",
    "resolveVerikitFields",
    "resourceQueryKeys",
    "restoreDeletedRecord",
    "restoreResourceQueries",
    "setValueAtPath",
    "snapshotResourceQueries",
    "submitVerikitActionForm",
    "submitVerikitResourceForm",
    "submitVerikitSchemaTreeActionForm",
    "submitVerikitSchemaTreeForm",
    "unsetValueAtPath",
    "validationIssuesToFieldErrors",
  ]);
});
