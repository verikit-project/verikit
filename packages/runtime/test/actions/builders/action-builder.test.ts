import assert from "node:assert/strict";
import test from "node:test";
import { definePermissions, text } from "@verikit/core";
import { action } from "../../../src/actions/builders/index.js";

test("action builder produces a schema for identity, presentation, confirmation, form, and result", () => {
  const publish = action("publish")
    .label("Publish")
    .description("Make the record visible")
    .icon("send")
    .variant("primary")
    .meta({ placement: "toolbar" })
    .confirmation({
      title: "Publish record",
      message: "Publish this record now?",
      confirmLabel: "Publish",
      cancelLabel: "Cancel",
    })
    .form({
      note: text().required(),
    })
    .result({
      successMessage: "Published",
      errorMessage: "Could not publish",
    });

  assert.deepEqual(publish.toSchema(), {
    type: "action",
    name: "publish",
    label: "Publish",
    description: "Make the record visible",
    icon: "send",
    variant: "primary",
    confirmation: {
      title: "Publish record",
      message: "Publish this record now?",
      confirmLabel: "Publish",
      cancelLabel: "Cancel",
    },
    form: {
      note: {
        type: "field",
        name: "note",
        fieldType: "text",
        required: true,
        nullable: false,
      },
    },
    result: {
      successMessage: "Published",
      errorMessage: "Could not publish",
    },
    meta: { placement: "toolbar" },
  });
});

test("action builder methods are immutable", () => {
  const base = action("archive");
  const labelled = base.label("Archive");

  assert.equal(base.toSchema().label, undefined);
  assert.equal(labelled.toSchema().label, "Archive");
});

test(".permissions() attaches a permissions definition without appearing in the adapter-facing schema", () => {
  const permissions = definePermissions().action("archive", false);
  const base = action("archive");
  const guarded = base.permissions(permissions);

  assert.equal(base.getRuntime().permissions, undefined);
  assert.equal(guarded.getRuntime().permissions, permissions);
  assert.deepEqual(guarded.toSchema(), {
    type: "action",
    name: "archive",
    label: undefined,
    description: undefined,
    icon: undefined,
    variant: undefined,
    confirmation: undefined,
    form: undefined,
    result: undefined,
    meta: undefined,
  });
});
