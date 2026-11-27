import assert from "node:assert/strict";
import test from "node:test";

test("ui-core package exposes its public entrypoint", async () => {
  const module = await import("../../src/index.js");

  assert.deepEqual(Object.keys(module).sort(), [
    "actionLabel",
    "actionNeedsDialog",
    "currentPathname",
    "firstFieldError",
    "firstFieldErrors",
    "formatFieldValue",
    "getValueAtPath",
    "hasValueAtPath",
    "inferAndValidateResource",
    "inferAndValidateSchemaTree",
    "isPlainLeftClick",
    "isResource",
    "matchPanelRoute",
    "navigate",
    "needsRelationshipLabels",
    "normalizeBasePath",
    "omitFieldError",
    "panelHref",
    "patchCachedListRecord",
    "pathKey",
    "recordId",
    "relationshipCellText",
    "removeCachedListRecord",
    "resolveVerikitFields",
    "resourceActionSchemas",
    "resourceColumnSpecs",
    "resourceQueryKeys",
    "restoreDeletedRecord",
    "restoreResourceQueries",
    "setValueAtPath",
    "snapshotResourceQueries",
    "submitVerikitActionForm",
    "submitVerikitResourceForm",
    "submitVerikitSchemaTreeActionForm",
    "submitVerikitSchemaTreeForm",
    "subscribeToLocation",
    "unavailableAction",
    "unsetValueAtPath",
    "validationIssuesToFieldErrors",
  ]);
});
