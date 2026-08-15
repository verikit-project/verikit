import assert from "node:assert/strict";
import test from "node:test";
import { defineResource, number, text } from "@verikit/core";
import { action } from "@verikit/runtime";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useVerikitSchemaTreeForm } from "../../src/index.js";

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

  const ResourceProbe = defineComponent({
    setup() {
      resourceTree = useVerikitSchemaTreeForm({ resource: orderResource }).tree;
      return () => null;
    },
  });
  const SchemaProbe = defineComponent({
    setup() {
      schemaTree = useVerikitSchemaTreeForm({
        resource: orderResource.toSchema(),
      }).tree;
      return () => null;
    },
  });

  mount(ResourceProbe);
  mount(SchemaProbe);
  assert.deepEqual(resourceTree, schemaTree);
});

test("useVerikitSchemaTreeForm wires TanStack form state to a nested schema tree", async () => {
  let captured: ReturnType<typeof useVerikitSchemaTreeForm<string>> | undefined;
  const submittedValues: unknown[] = [];

  const Probe = defineComponent({
    setup() {
      const form = useVerikitSchemaTreeForm<string>({
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
      return () => h("span", String(form.tree.length));
    },
  });

  const wrapper = mount(Probe);
  assert.equal(wrapper.html(), "<span>2</span>");
  assert.ok(captured);

  assert.deepEqual(
    captured.tree.map((node) => node.type),
    ["section", "repeater"],
  );
  assert.equal(captured.getFieldError(["email"]), undefined);
  assert.deepEqual(captured.treeProps.value.values, {
    email: "buyer@example.com",
    items: [{ itemName: "Widget", itemQty: 2 }],
  });

  captured.treeProps.value.onFieldBlur?.(["email"]);
  captured.treeProps.value.onFieldChange?.(["items", 0, "itemQty"], 5);
  assert.equal(captured.form.getFieldValue("items.0.itemQty"), 5);

  captured.setFieldErrors({ email: ["Already used"] });
  captured.clearFieldErrors();

  captured.treeProps.value.onRepeaterAdd?.(["items"]);
  assert.deepEqual(captured.form.getFieldValue("items"), [
    { itemName: "Widget", itemQty: 5 },
    {},
  ]);

  captured.treeProps.value.onRepeaterRemove?.(["items"], 1);
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
    fields: { title: text().required() },
  }).form((f) => [f.field("title"), f.action("publish")]);
  let captured: ReturnType<typeof useVerikitSchemaTreeForm> | undefined;

  const Probe = defineComponent({
    setup() {
      captured = useVerikitSchemaTreeForm({
        resource: resourceWithAction,
        actions: { publish },
      });
      return () => null;
    },
  });

  mount(Probe);
  assert.ok(captured);
  assert.equal(captured.treeProps.value.actions?.publish, publish);
});

test("useVerikitSchemaTreeForm's repeater handlers start a fresh array when no rows exist yet", () => {
  let captured: ReturnType<typeof useVerikitSchemaTreeForm> | undefined;

  const Probe = defineComponent({
    setup() {
      captured = useVerikitSchemaTreeForm({
        resource: orderResource,
        defaultValues: { email: "buyer@example.com" },
      });
      return () => null;
    },
  });

  mount(Probe);
  assert.ok(captured);

  captured.treeProps.value.onRepeaterRemove?.(["items"], 0);
  assert.equal(captured.form.getFieldValue("items"), undefined);

  captured.treeProps.value.onRepeaterAdd?.(["items"]);
  assert.deepEqual(captured.form.getFieldValue("items"), [{}]);
});

test("getRepeaterRowKey keeps each row's id stable across a middle removal", () => {
  let captured: ReturnType<typeof useVerikitSchemaTreeForm> | undefined;

  const Probe = defineComponent({
    setup() {
      captured = useVerikitSchemaTreeForm({
        resource: orderResource,
        defaultValues: { items: [{}, {}, {}] },
      });
      return () => null;
    },
  });

  mount(Probe);
  assert.ok(captured);

  const keyAt = (index: number) =>
    captured!.treeProps.value.getRepeaterRowKey?.(["items"], index);

  const key0 = keyAt(0);
  const key1 = keyAt(1);
  const key2 = keyAt(2);

  assert.ok(key0);
  assert.ok(key1);
  assert.ok(key2);
  assert.notEqual(key0, key1);
  assert.notEqual(key1, key2);

  captured.treeProps.value.onRepeaterRemove?.(["items"], 1);
  assert.deepEqual(captured.form.getFieldValue("items"), [{}, {}]);

  // An index-based key would report `key1` (the removed row's old id) for
  // this position; the shifted row must keep carrying its own id instead.
  assert.equal(keyAt(0), key0);
  assert.equal(keyAt(1), key2);
});
