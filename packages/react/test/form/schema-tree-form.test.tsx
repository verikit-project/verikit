import assert from "node:assert/strict";
import test from "node:test";
import {
  defineResource,
  number,
  text,
  type FieldNode,
  type SchemaNode,
} from "@verikit/core";
import { action } from "@verikit/runtime";
import { renderToStaticMarkup } from "react-dom/server";
import {
  inferAndValidateSchemaTree,
  submitVerikitSchemaTreeForm,
  useVerikitSchemaTreeForm,
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

const orderResource = defineResource("Order", {
  fields: {
    email: text().required(),
    itemName: text().required(),
    itemQty: number().required(),
  },
}).form((f) => [
  f.section("Details", [f.field("email")]),
  f.repeater("items", [f.field("itemName"), f.field("itemQty")]),
]);

test("useVerikitSchemaTreeForm resolves its tree from either a Resource or a ResourceSchema", () => {
  let resourceTree: unknown;
  let schemaTree: unknown;

  function ResourceProbe() {
    resourceTree = useVerikitSchemaTreeForm({ resource: orderResource }).tree;
    return null;
  }

  function SchemaProbe() {
    schemaTree = useVerikitSchemaTreeForm({
      resource: orderResource.toSchema(),
    }).tree;
    return null;
  }

  renderToStaticMarkup(<ResourceProbe />);
  renderToStaticMarkup(<SchemaProbe />);
  assert.deepEqual(resourceTree, schemaTree);
});

test("useVerikitSchemaTreeForm wires TanStack form state to a nested schema tree", async () => {
  let captured: ReturnType<typeof useVerikitSchemaTreeForm<string>> | undefined;
  const submittedValues: unknown[] = [];

  function Probe() {
    const form = useVerikitSchemaTreeForm({
      resource: orderResource,
      defaultValues: {
        email: "buyer@example.com",
        items: [{ itemName: "Widget", itemQty: 2 }],
      },
      onSubmit: (values) => {
        submittedValues.push(values);
        return "saved";
      },
    });
    captured = form;

    assert.deepEqual(
      form.tree.map((node) => node.type),
      ["section", "repeater"],
    );
    assert.equal(form.getFieldError(["email"]), undefined);
    assert.deepEqual(form.treeProps.values, {
      email: "buyer@example.com",
      items: [{ itemName: "Widget", itemQty: 2 }],
    });

    return <span>{form.tree.length}</span>;
  }

  assert.equal(renderToStaticMarkup(<Probe />), "<span>2</span>");
  assert.ok(captured);

  captured.treeProps.onFieldBlur?.(["email"]);
  captured.treeProps.onFieldChange?.(["items", 0, "itemQty"], 5);
  assert.equal(captured.form.getFieldValue("items.0.itemQty"), 5);

  captured.setFieldErrors({ email: ["Already used"] });
  captured.clearFieldErrors();

  captured.treeProps.onRepeaterAdd?.(["items"]);
  assert.deepEqual(captured.form.getFieldValue("items"), [
    { itemName: "Widget", itemQty: 5 },
    {},
  ]);

  captured.treeProps.onRepeaterRemove?.(["items"], 1);
  assert.deepEqual(captured.form.getFieldValue("items"), [
    { itemName: "Widget", itemQty: 5 },
  ]);

  const validated = await captured.validate({
    email: "buyer@example.com",
    items: [{ itemName: "Widget", itemQty: "5" }],
  });
  assert.equal(validated.success, true);
  assert.deepEqual(submittedValues, []);

  const submitted = await captured.submit({
    email: "buyer@example.com",
    items: [{ itemName: "Widget", itemQty: "5" }],
  });
  assert.equal(submitted.success, true);
  assert.equal(submitted.result, "saved");
  assert.equal(submittedValues.length, 1);

  await captured.form.options.onSubmit?.({
    formApi: captured.form,
    meta: undefined as never,
    value: {
      email: "buyer@example.com",
      items: [{ itemName: "Widget", itemQty: "5" }],
    },
  });
  assert.equal(submittedValues.length, 2);
});

test("useVerikitSchemaTreeForm passes runtime actions through tree props", () => {
  const publish = action("publish").form({ note: text().required() });
  const resourceWithAction = defineResource("Article", {
    fields: {
      title: text().required(),
    },
  }).form((f) => [f.field("title"), f.action("publish")]);
  let captured: ReturnType<typeof useVerikitSchemaTreeForm> | undefined;

  function Probe() {
    captured = useVerikitSchemaTreeForm({
      resource: resourceWithAction,
      actions: { publish },
    });
    return null;
  }

  renderToStaticMarkup(<Probe />);
  assert.ok(captured);
  assert.equal(captured.treeProps.actions?.publish, publish);
});

test("useVerikitSchemaTreeForm's repeater handlers start a fresh array when no rows exist yet", () => {
  let captured: ReturnType<typeof useVerikitSchemaTreeForm> | undefined;

  function Probe() {
    captured = useVerikitSchemaTreeForm({
      resource: orderResource,
      defaultValues: { email: "buyer@example.com" },
    });
    return null;
  }

  renderToStaticMarkup(<Probe />);
  assert.ok(captured);

  captured.treeProps.onRepeaterRemove?.(["items"], 0);
  assert.equal(captured.form.getFieldValue("items"), undefined);

  captured.treeProps.onRepeaterAdd?.(["items"]);
  assert.deepEqual(captured.form.getFieldValue("items"), [{}]);
});

test("getRepeaterRowKey keeps each row's id stable across a middle removal", () => {
  let captured: ReturnType<typeof useVerikitSchemaTreeForm> | undefined;

  function Probe() {
    captured = useVerikitSchemaTreeForm({
      resource: orderResource,
      defaultValues: { items: [{}, {}, {}] },
    });
    return null;
  }

  renderToStaticMarkup(<Probe />);
  assert.ok(captured);

  const keyAt = (index: number) =>
    captured!.treeProps.getRepeaterRowKey?.(["items"], index);

  const key0 = keyAt(0);
  const key1 = keyAt(1);
  const key2 = keyAt(2);

  assert.ok(key0);
  assert.ok(key1);
  assert.ok(key2);
  assert.notEqual(key0, key1);
  assert.notEqual(key1, key2);

  // Remove the middle row: what was row 2 shifts down to index 1.
  captured.treeProps.onRepeaterRemove?.(["items"], 1);
  assert.deepEqual(captured.form.getFieldValue("items"), [{}, {}]);

  // An index-based key would report `key1` (the removed row's old id) for
  // this position; the shifted row must keep carrying its own id instead.
  assert.equal(keyAt(0), key0);
  assert.equal(keyAt(1), key2);
});
