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

test("submitVerikitSchemaTreeForm treats an empty repeater as having no rows to validate", async () => {
  const result = await submitVerikitSchemaTreeForm({
    tree: richTree,
    values: { ...validRichValues, items: [] },
  });
  assert.equal(result.success, true);
  assert.deepEqual((result.success && result.value.items) ?? [], []);
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
