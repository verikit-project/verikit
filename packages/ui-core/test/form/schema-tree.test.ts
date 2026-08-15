import assert from "node:assert/strict";
import test from "node:test";
import {
  number,
  text,
  type FieldNode,
  type SchemaNode,
} from "@verikit/core";
import { action } from "@verikit/runtime";
import {
  inferAndValidateSchemaTree,
  submitVerikitSchemaTreeActionForm,
  submitVerikitSchemaTreeForm,
} from "../../src/index.js";

const requiredField = (name: string): FieldNode =>
  text().required().toSchema(name);

const richTree: SchemaNode[] = [
  {
    type: "section",
    title: "Basics",
    children: [requiredField("email")],
  },
  {
    type: "grid",
    columns: 2,
    children: [requiredField("name")],
  },
  {
    type: "tabs",
    tabs: [
      { title: "One", children: [requiredField("tabOne")] },
      { title: "Two", children: [requiredField("tabTwo")] },
    ],
  },
  {
    type: "wizard",
    steps: [
      { title: "Step 1", children: [requiredField("stepOne")] },
      { title: "Step 2", children: [requiredField("stepTwo")] },
    ],
  },
  {
    type: "repeater",
    name: "items",
    children: [
      requiredField("itemName"),
      number().required().toSchema("itemQty"),
    ],
  },
  {
    type: "action",
    name: "publish",
    input: [requiredField("note")],
  },
  {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "owner",
    resource: "User",
  },
];

const validRichValues = {
  email: "buyer@example.com",
  name: "Ada",
  tabOne: "a",
  tabTwo: "b",
  stepOne: "c",
  stepTwo: "d",
  items: [{ itemName: "Widget", itemQty: "2" }],
};

test("submitVerikitSchemaTreeForm walks every reachable node, skipping relationships and action inputs", async () => {
  const missingEverything = await submitVerikitSchemaTreeForm({
    tree: richTree,
    values: {},
  });
  assert.equal(missingEverything.success, false);
  assert.equal(missingEverything.reason, "validation");
  assert.deepEqual(
    Object.keys(missingEverything.fieldErrors).sort(),
    ["email", "name", "stepOne", "stepTwo", "tabOne", "tabTwo"].sort(),
  );

  const missingRepeaterRow = await submitVerikitSchemaTreeForm({
    tree: richTree,
    values: { ...validRichValues, items: [{ itemName: "Widget" }] },
  });
  assert.equal(missingRepeaterRow.success, false);
  assert.deepEqual(Object.keys(missingRepeaterRow.fieldErrors), [
    "items.0.itemQty",
  ]);

  const success = await submitVerikitSchemaTreeForm({
    tree: richTree,
    values: validRichValues,
  });
  assert.equal(success.success, true);
  assert.deepEqual(success.value, {
    ...validRichValues,
    items: [{ itemName: "Widget", itemQty: 2 }],
  });
});

test("submitVerikitSchemaTreeForm calls onSubmit with the inferred and validated values", async () => {
  const submitted: unknown[] = [];

  const result = await submitVerikitSchemaTreeForm({
    tree: richTree,
    values: validRichValues,
    onSubmit: (values) => {
      submitted.push(values);
      return "saved";
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.success && result.result, "saved");
  assert.deepEqual(submitted, [result.success ? result.value : undefined]);
});

test("submitVerikitSchemaTreeForm drops a readOnly field's value, even when required", async () => {
  const treeWithReadOnly: SchemaNode[] = [
    requiredField("name"),
    text().required().readOnly().toSchema("id"),
  ];

  // "id" has no value at all here it's required, but readOnly, so it must
  // never block submission on a value that will never actually be sent.
  const result = await submitVerikitSchemaTreeForm({
    tree: treeWithReadOnly,
    values: { name: "Ada" },
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.success && result.value, { name: "Ada" });

  const withClientValue = await submitVerikitSchemaTreeForm({
    tree: treeWithReadOnly,
    values: { name: "Ada", id: "client-supplied" },
  });
  assert.equal(withClientValue.success, true);
  assert.equal(withClientValue.success && withClientValue.value.id, undefined);
});

test("submitVerikitSchemaTreeForm treats an empty repeater as having no rows to validate", async () => {
  const result = await submitVerikitSchemaTreeForm({
    tree: richTree,
    values: { ...validRichValues, items: [] },
  });
  assert.equal(result.success, true);
  assert.deepEqual((result.success && result.value.items) ?? [], []);
});

test("submitVerikitSchemaTreeForm skips a truly absent optional field instead of validating it as undefined", async () => {
  // `shouldValidateTreeField` used to build `{ [key]: getValueAtPath(...) }`
  // unconditionally an object literal with a computed key always creates that key,
  // even when the value is `undefined`, so every optional field looked "present" and its custom validator ran against `undefined`.
  const nickname = text()
    .optional()
    .validation({
      parse: (value: unknown) => {
        if (typeof value !== "string") {
          throw new Error("Custom validator ran against a non-string value.");
        }
        return value;
      },
    })
    .toSchema("nickname");
  const tree: SchemaNode[] = [nickname];

  const result = await submitVerikitSchemaTreeForm({ tree, values: {} });

  assert.equal(result.success, true);
});

test("submitVerikitSchemaTreeForm validates every repeater row and every tab/step, not just the first", async () => {
  const result = await submitVerikitSchemaTreeForm({
    tree: richTree,
    values: {
      ...validRichValues,
      items: [
        { itemName: "Widget", itemQty: "2" },
        { itemName: "Gadget", itemQty: "nope" },
      ],
    },
  });
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(result.fieldErrors), ["items.1.itemQty"]);
});

test("submitVerikitSchemaTreeForm merges errors for a field reachable from two tree positions", async () => {
  const duplicateTree: SchemaNode[] = [
    { type: "section", title: "A", children: [requiredField("email")] },
    { type: "section", title: "B", children: [requiredField("email")] },
  ];

  const result = await submitVerikitSchemaTreeForm({
    tree: duplicateTree,
    values: {},
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.fieldErrors, {
    email: ["This field is required.", "This field is required."],
  });
});

test("submitVerikitSchemaTreeForm skips a required field hidden by an unmet sibling condition, and enforces it once met", async () => {
  const tree: SchemaNode[] = [
    text().toSchema("kind"),
    text().required().visibleWhen("kind", "custom").toSchema("note"),
  ];

  const hidden = await submitVerikitSchemaTreeForm({
    tree,
    values: { kind: "standard" },
  });
  assert.equal(hidden.success, true);
  assert.deepEqual(hidden.success && hidden.value, { kind: "standard" });

  const shown = await submitVerikitSchemaTreeForm({
    tree,
    values: { kind: "custom" },
  });
  assert.equal(shown.success, false);
  assert.deepEqual(Object.keys(shown.fieldErrors), ["note"]);

  const shownAndFilled = await submitVerikitSchemaTreeForm({
    tree,
    values: { kind: "custom", note: "Details" },
  });
  assert.equal(shownAndFilled.success, true);
});

test("a conditional field inside a repeater row is evaluated against that row's own sibling values", async () => {
  const tree: SchemaNode[] = [
    {
      type: "repeater",
      name: "items",
      children: [
        text().toSchema("kind"),
        text().required().visibleWhen("kind", "custom").toSchema("note"),
      ],
    },
  ];

  const result = await submitVerikitSchemaTreeForm({
    tree,
    values: {
      items: [{ kind: "standard" }, { kind: "custom", note: "Details" }],
    },
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.success && result.value, {
    items: [{ kind: "standard" }, { kind: "custom", note: "Details" }],
  });

  const missingSecondRow = await submitVerikitSchemaTreeForm({
    tree,
    values: { items: [{ kind: "standard" }, { kind: "custom" }] },
  });
  assert.equal(missingSecondRow.success, false);
  assert.deepEqual(Object.keys(missingSecondRow.fieldErrors), ["items.1.note"]);
});

test("a conditional field whose own row isn't a plain object falls back to no sibling values, treating its condition as unmet", async () => {
  const tree: SchemaNode[] = [
    {
      type: "repeater",
      name: "items",
      children: [
        text().required().visibleWhen("kind", "custom").toSchema("note"),
      ],
    },
  ];

  // A malformed row (a bare string instead of an object): `note`'s
  // condition has no sibling values to read there, so it's unmet and the
  // otherwise-required field doesn't block submission.
  const result = await submitVerikitSchemaTreeForm({
    tree,
    values: { items: ["not-an-object"] },
  });

  assert.equal(result.success, true);
});

test("inferAndValidateSchemaTree mirrors submitVerikitSchemaTreeForm's infer+validate pipeline", async () => {
  const success = await inferAndValidateSchemaTree(richTree, validRichValues);
  assert.equal(success.success, true);

  const failure = await inferAndValidateSchemaTree(richTree, {});
  assert.equal(failure.success, false);
});

test("schema tree action submission extracts nested action input values", async () => {
  const publish = action("publish")
    .form({
      note: text().required(),
      priority: number().required(),
    })
    .execute(({ input }) => `${input.note}:${input.priority}`);

  const success = await submitVerikitSchemaTreeActionForm({
    action: publish,
    request: { context: {} },
    values: { publish: { note: "Ready", priority: "2" } },
  });
  assert.equal(success.success, true);
  assert.equal(success.result, "Ready:2");

  const validation = await submitVerikitSchemaTreeActionForm({
    action: publish,
    request: { context: {} },
    values: { modal: { note: "", priority: "2" } },
    path: ["modal"],
  });
  assert.equal(validation.success, false);
  assert.equal(validation.reason, "validation");
  assert.deepEqual(Object.keys(validation.fieldErrors), ["note"]);

  const missingPath = await submitVerikitSchemaTreeActionForm({
    action: publish,
    request: { context: {} },
    values: {},
  });
  assert.equal(missingPath.success, false);
  assert.equal(missingPath.reason, "validation");
  assert.deepEqual(Object.keys(missingPath.fieldErrors).sort(), [
    "note",
    "priority",
  ]);
});
