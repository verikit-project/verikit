import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, text } from "@verikit/core";
import { action } from "@verikit/runtime";
import {
  actionLabel,
  actionNeedsDialog,
  resourceActionSchemas,
} from "../../src/index.js";

const publish = action("publish").label("Publish");
const archive = action("archive").scope("record").confirmation("Archive?");
const exportAll = action("exportAll").scope("collection");

const resource = defineResource("post", {
  fields: { title: text() },
  actions: [publish, archive, exportAll],
});

test("resourceActionSchemas reads declared actions from a resource or its schema", () => {
  const names = (source: Parameters<typeof resourceActionSchemas>[0]) =>
    resourceActionSchemas(source).map(({ name }) => name);

  assert.deepEqual(names(resource), ["publish", "archive", "exportAll"]);
  assert.deepEqual(names(resource.toSchema()), [
    "publish",
    "archive",
    "exportAll",
  ]);
  assert.deepEqual(
    resourceActionSchemas(defineResource("empty", { fields: {} }).toSchema()),
    [],
  );
});

test("resourceActionSchemas filters by scope, treating unscoped actions as record actions", () => {
  assert.deepEqual(
    resourceActionSchemas(resource, "record").map(({ name }) => name),
    ["publish", "archive"],
  );
  assert.deepEqual(
    resourceActionSchemas(resource, "collection").map(({ name }) => name),
    ["exportAll"],
  );
});

test("actionNeedsDialog is true for a confirmation or a non-empty form", () => {
  assert.equal(actionNeedsDialog(publish.toSchema()), false);
  assert.equal(actionNeedsDialog(archive.toSchema()), true);
  assert.equal(
    actionNeedsDialog(action("note").form({ note: text() }).toSchema()),
    true,
  );
  assert.equal(actionNeedsDialog(action("empty").form({}).toSchema()), false);
});

test("actionLabel falls back to the action name", () => {
  assert.equal(actionLabel(publish.toSchema()), "Publish");
  assert.equal(actionLabel(exportAll.toSchema()), "exportAll");
});
