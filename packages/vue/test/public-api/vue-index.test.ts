import assert from "node:assert/strict";
import test from "node:test";

test("vue package exposes its public entrypoint", async () => {
  const module = await import("../../src/index.js");

  assert.deepEqual(Object.keys(module).sort(), [
    "VerikitProvider",
    "cn",
    "firstFieldError",
    "firstFieldErrors",
    "getValueAtPath",
    "inferAndValidateResource",
    "inferAndValidateSchemaTree",
    "omitFieldError",
    "pathKey",
    "resolveVerikitFields",
    "resourceQueryKeys",
    "setValueAtPath",
    "submitVerikitActionForm",
    "submitVerikitResourceForm",
    "submitVerikitSchemaTreeActionForm",
    "submitVerikitSchemaTreeForm",
    "useActionResource",
    "useCreateResource",
    "useDeleteResource",
    "useListResource",
    "useResourceFind",
    "useResourceForm",
    "useResourceRelationship",
    "useResourceSchemaTreeForm",
    "useUpdateResource",
    "useVerikitClient",
    "useVerikitForm",
    "useVerikitSchemaTreeForm",
    "validationIssuesToFieldErrors",
  ]);
  assert.equal(
    module.cn("text-sm", false, ["font-medium"]),
    "text-sm font-medium",
  );
});
