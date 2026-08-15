import assert from "node:assert/strict";
import test from "node:test";
import type {
  ActionNode,
  FieldNode,
  GridNode,
  RelationshipNode,
  RepeaterNode,
  SectionNode,
  TabsNode,
  WizardNode,
} from "@verikit/core";
import { text } from "@verikit/core";
import { action } from "@verikit/runtime";
import type { VNode } from "vue";
import {
  RenderSchemaNode,
  RenderSchemaTree,
} from "../../src/layout/render-schema-node.js";
import { BelongsToRelationshipField } from "../../src/relationships/belongs-to-field.js";
import { asVNode, childrenOf } from "../support/vnode.js";

/** Unwraps one level of `RenderSchemaTree`'s keyed Fragment wrapper. */
function treeNodeAt(nodes: unknown, index: number): unknown {
  const fragment = asVNode((nodes as unknown[])[index]);
  return childrenOf(fragment)[0];
}

test("field nodes read nested values via path and forward change/blur paths", () => {
  const node: FieldNode = { type: "field", name: "email", fieldType: "email" };
  const changes: unknown[] = [];
  const blurs: unknown[] = [];
  const element = asVNode(
    RenderSchemaNode({
      node,
      path: ["contacts", 1],
      values: { contacts: [{}, { email: "a@b.com" }] },
      errors: { "contacts.1.email": "Invalid" },
      className: "col-span-2",
      onFieldChange: (path, value) => changes.push([path, value]),
      onFieldBlur: (path) => blurs.push(path),
    }),
  );

  assert.equal(element.props?.field, node);
  assert.equal(element.props?.value, "a@b.com");
  assert.equal(element.props?.error, "Invalid");
  assert.equal(element.props?.className, "col-span-2");
  (element.props?.onValueChange as (value: unknown) => void)("next@b.com");
  (element.props?.onBlur as () => void)();
  assert.deepEqual(changes, [[["contacts", 1, "email"], "next@b.com"]]);
  assert.deepEqual(blurs, [["contacts", 1, "email"]]);
});

test("field nodes default to an empty path when none is given", () => {
  const node: FieldNode = { type: "field", name: "title", fieldType: "text" };
  const element = asVNode(
    RenderSchemaNode({ node, values: { title: "Hello" } }),
  );

  assert.equal(element.props?.value, "Hello");
  assert.equal(element.props?.error, undefined);
});

test("relationship nodes render nothing without a renderer, and delegate when one is provided", () => {
  const node: RelationshipNode = {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "users",
  };

  assert.equal(RenderSchemaNode({ node, values: {} }), null);

  const seen: unknown[] = [];
  const rendered = RenderSchemaNode({
    node,
    values: {},
    path: ["post"],
    renderRelationship: (relationship, path) => {
      seen.push([relationship.resource, path]);
      return relationship.resource;
    },
  });

  assert.equal(rendered, "users");
  assert.deepEqual(seen, [["users", ["post"]]]);
});

test("a belongsTo relationship with a resolvable foreign key renders the built-in picker by default", () => {
  const node: RelationshipNode = {
    type: "relationship",
    relationshipType: "belongsTo",
    name: "author",
    resource: "authors",
    foreignKey: "authorId",
    displayField: "name",
  };
  const changes: unknown[] = [];
  const blurs: unknown[] = [];
  const element = asVNode(
    RenderSchemaNode({
      node,
      path: ["post"],
      values: { post: { authorId: "42" } },
      errors: { "post.authorId": "Required" },
      onFieldChange: (path, value) => changes.push([path, value]),
      onFieldBlur: (path) => blurs.push(path),
    }),
  );

  assert.equal(element.type, BelongsToRelationshipField);
  assert.equal(element.props?.relationship, node);
  assert.equal(element.props?.value, "42");
  assert.equal(element.props?.error, "Required");
  (element.props?.onValueChange as (value: unknown) => void)("7");
  (element.props?.onBlur as () => void)();
  assert.deepEqual(changes, [[["post", "authorId"], "7"]]);
  assert.deepEqual(blurs, [["post", "authorId"]]);
});

test("a belongsTo relationship without a resolvable string foreign key renders nothing by default", () => {
  const node: RelationshipNode = {
    type: "relationship",
    relationshipType: "belongsTo",
    resource: "authors",
    foreignKey: { column: "author_id" },
  };

  assert.equal(RenderSchemaNode({ node, values: {} }), null);
});

test("hasMany and belongsToMany relationships render nothing by default, even with a foreign key", () => {
  const hasManyNode: RelationshipNode = {
    type: "relationship",
    relationshipType: "hasMany",
    resource: "posts",
    foreignKey: "authorId",
  };
  const belongsToManyNode: RelationshipNode = {
    type: "relationship",
    relationshipType: "belongsToMany",
    resource: "tags",
    foreignKey: "tagId",
  };

  assert.equal(RenderSchemaNode({ node: hasManyNode, values: {} }), null);
  assert.equal(RenderSchemaNode({ node: belongsToManyNode, values: {} }), null);
});

test("a consumer-supplied renderRelationship overrides the built-in belongsTo picker", () => {
  const node: RelationshipNode = {
    type: "relationship",
    relationshipType: "belongsTo",
    resource: "authors",
    foreignKey: "authorId",
  };
  const rendered = RenderSchemaNode({
    node,
    values: {},
    renderRelationship: () => "custom",
  });

  assert.equal(rendered, "custom");
});

test("a field node hidden by an unmet condition renders nothing, and renders once its condition is met", () => {
  const node: FieldNode = {
    type: "field",
    name: "note",
    fieldType: "text",
    condition: { field: "kind", equals: "custom" },
  };

  assert.equal(RenderSchemaNode({ node, values: { kind: "standard" } }), null);

  const element = asVNode(
    RenderSchemaNode({ node, values: { kind: "custom" } }),
  );
  assert.equal(element.props?.field, node);
});

test("a field node's condition falls back to unmet when its own container isn't a plain object", () => {
  const node: FieldNode = {
    type: "field",
    name: "note",
    fieldType: "text",
    condition: { field: "kind", equals: "custom" },
  };

  // The "items" row at index 0 is a bare string, not an object  the
  // condition has no sibling values to read, so it's treated as unmet.
  assert.equal(
    RenderSchemaNode({
      node,
      path: ["items", 0],
      values: { items: ["not-an-object"] },
    }),
    null,
  );
});

test("section nodes render a title and recurse into children with an inherited path", () => {
  const node: SectionNode = {
    type: "section",
    title: "Profile",
    children: [{ type: "field", name: "title", fieldType: "text" }],
  };
  const element = asVNode(
    RenderSchemaNode({
      node,
      values: { a: { title: "Hi" } },
      path: ["a"],
      className: "extra",
    }),
  );

  assert.equal(element.type, "section");
  assert.match(String(element.props?.class), /extra/);

  const [heading, tree] = childrenOf(element);
  assert.equal(childrenOf(heading)[0], "Profile");

  const fieldVNode = asVNode(treeNodeAt(tree, 0));
  assert.equal(fieldVNode.props?.field, node.children[0]);
  assert.equal(fieldVNode.props?.value, "Hi");
});

test("grid nodes set a column-count style and recurse into children", () => {
  const node: GridNode = {
    type: "grid",
    columns: 3,
    children: [{ type: "field", name: "title", fieldType: "text" }],
  };
  const element = asVNode(RenderSchemaNode({ node, values: {} }));

  assert.deepEqual(element.props?.style, {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  });

  const [tree] = childrenOf(element);
  const fieldVNode = asVNode(treeNodeAt(tree, 0));
  assert.equal(fieldVNode.props?.field, node.children[0]);
});

test("tabs render only the active tab and report clicks", () => {
  const node: TabsNode = {
    type: "tabs",
    tabs: [
      {
        title: "General",
        children: [{ type: "field", name: "name", fieldType: "text" }],
      },
      {
        title: "Advanced",
        children: [{ type: "field", name: "slug", fieldType: "text" }],
      },
    ],
  };
  const changes: number[] = [];
  const element = asVNode(
    RenderSchemaNode({
      node,
      values: {},
      activeTab: 1,
      onActiveTabChange: (index) => changes.push(index),
    }),
  );
  const [tabList, panel] = childrenOf(element);
  const buttons = childrenOf(tabList).map((child) => asVNode(child));

  assert.equal(buttons.length, 2);
  assert.equal(buttons[0]?.props?.["aria-selected"], false);
  assert.equal(buttons[1]?.props?.["aria-selected"], true);
  assert.equal(buttons[0]?.props?.variant, "ghost");
  assert.equal(buttons[1]?.props?.variant, "secondary");
  assert.equal(childrenOf(buttons[0])[0], "General");
  assert.equal(childrenOf(buttons[1])[0], "Advanced");
  (buttons[0]?.props?.onClick as () => void)();
  assert.deepEqual(changes, [0]);

  const [tree] = childrenOf(panel);
  const fieldVNode = asVNode(treeNodeAt(tree, 0));
  assert.equal(fieldVNode.props?.field, node.tabs[1]?.children[0]);
});

test("tabs clamp an out-of-range active index and render nothing with no tabs", () => {
  const node: TabsNode = {
    type: "tabs",
    tabs: [{ title: "Only", children: [] }],
  };
  const clamped = asVNode(RenderSchemaNode({ node, values: {}, activeTab: 5 }));
  const [, panel] = childrenOf(clamped);
  assert.notEqual(panel, null);

  const empty = asVNode(
    RenderSchemaNode({ node: { type: "tabs", tabs: [] }, values: {} }),
  );
  const [, emptyPanel] = childrenOf(empty);
  assert.equal(emptyPanel, null);
});

test("wizard renders steps, disables boundary nav buttons, and reports navigation", () => {
  const node: WizardNode = {
    type: "wizard",
    steps: [
      {
        title: "Basics",
        children: [{ type: "field", name: "name", fieldType: "text" }],
      },
      { title: "Review", children: [] },
    ],
  };
  const changes: number[] = [];
  const first = asVNode(
    RenderSchemaNode({
      node,
      values: {},
      activeStep: 0,
      onActiveStepChange: (index) => changes.push(index),
    }),
  );
  const [stepList, , nav] = childrenOf(first);
  const items = childrenOf(stepList).map((item) => asVNode(item));

  assert.equal(items[0]?.props?.["aria-current"], "step");
  assert.equal(items[1]?.props?.["aria-current"], undefined);
  assert.equal(childrenOf(items[0])[0], "Basics");

  const [back, next] = childrenOf(nav).map((button) => asVNode(button));
  assert.equal(back?.props?.disabled, true);
  assert.equal(next?.props?.disabled, false);
  assert.equal(childrenOf(back)[0], "Back");
  assert.equal(childrenOf(next)[0], "Next");
  (back?.props?.onClick as () => void)();
  (next?.props?.onClick as () => void)();
  assert.deepEqual(changes, [-1, 1]);

  const last = asVNode(RenderSchemaNode({ node, values: {}, activeStep: 1 }));
  const [, , lastNav] = childrenOf(last);
  const [lastBack, lastNext] = childrenOf(lastNav).map((button) =>
    asVNode(button),
  );
  assert.equal(lastBack?.props?.disabled, false);
  assert.equal(lastNext?.props?.disabled, true);
});

test("wizard with no steps renders no step content", () => {
  const element = asVNode(
    RenderSchemaNode({ node: { type: "wizard", steps: [] }, values: {} }),
  );
  const [, tree] = childrenOf(element);

  assert.equal(tree, null);
});

test("repeater renders one block per array item and reports add/remove", () => {
  const node: RepeaterNode = {
    type: "repeater",
    name: "tags",
    children: [{ type: "field", name: "label", fieldType: "text" }],
  };
  const removed: unknown[] = [];
  const added: unknown[] = [];
  const element = asVNode(
    RenderSchemaNode({
      node,
      values: { tags: [{ label: "a" }, { label: "b" }] },
      onRepeaterAdd: (path) => added.push(path),
      onRepeaterRemove: (path, index) => removed.push([path, index]),
    }),
  );
  const children = childrenOf(element);
  const rows = children.slice(0, 2).map((row) => asVNode(row));
  const addButton = children[2];
  assert.equal(rows.length, 2);

  const [tree0, removeButton0] = childrenOf(rows[0]);
  const fieldVNode0 = asVNode(treeNodeAt(tree0, 0));
  assert.equal(fieldVNode0.props?.field, node.children[0]);
  assert.equal(childrenOf(removeButton0)[0], "Remove");
  (asVNode(removeButton0).props?.onClick as () => void)();
  assert.deepEqual(removed, [[["tags"], 0]]);

  assert.equal(childrenOf(addButton)[0], "Add");
  (asVNode(addButton).props?.onClick as () => void)();
  assert.deepEqual(added, [["tags"]]);
});

test("repeater rows use getRepeaterRowKey when supplied, falling back to index otherwise", () => {
  const node: RepeaterNode = { type: "repeater", name: "tags", children: [] };
  const values = { tags: [{ label: "a" }, { label: "b" }] };

  const withoutKeySource = asVNode(RenderSchemaNode({ node, values }));
  const defaultRows = childrenOf(withoutKeySource)
    .slice(0, 2)
    .map((row) => asVNode(row));
  assert.deepEqual(
    defaultRows.map((row) => row.key),
    [0, 1],
  );

  const seen: Array<[readonly unknown[], number]> = [];
  const withKeySource = asVNode(
    RenderSchemaNode({
      node,
      values,
      getRepeaterRowKey: (path, index) => {
        seen.push([path, index]);
        return `row-${index}`;
      },
    }),
  );
  const keyedRows = childrenOf(withKeySource)
    .slice(0, 2)
    .map((row) => asVNode(row));

  assert.deepEqual(
    keyedRows.map((row) => row.key),
    ["row-0", "row-1"],
  );
  assert.deepEqual(seen, [
    [["tags"], 0],
    [["tags"], 1],
  ]);
});

test("repeater with no array value renders only the add control", () => {
  const node: RepeaterNode = { type: "repeater", name: "tags", children: [] };
  const element = asVNode(RenderSchemaNode({ node, values: {} }));
  const children = childrenOf(element);

  assert.equal(children.length, 1);
});

test("action nodes render their input fields and report the click", () => {
  const node: ActionNode = {
    type: "action",
    name: "publish",
    label: "Publish now",
    input: [{ type: "field", name: "reason", fieldType: "text" }],
  };
  const clicks: unknown[] = [];
  const element = asVNode(
    RenderSchemaNode({
      node,
      values: {},
      path: ["post"],
      onAction: (name, path) => clicks.push([name, path]),
    }),
  );
  const [tree, button] = childrenOf(element);

  const fieldVNode = asVNode(treeNodeAt(tree, 0));
  assert.equal(fieldVNode.props?.field, node.input?.[0]);
  assert.equal(childrenOf(button)[0], "Publish now");
  (asVNode(button).props?.onClick as () => void)();
  assert.deepEqual(clicks, [["publish", ["post", "publish"]]]);
});

test("action nodes can render runtime action forms by name", () => {
  const node: ActionNode = {
    type: "action",
    name: "publish",
    label: "Layout label",
    input: [{ type: "field", name: "layoutOnly", fieldType: "text" }],
  };
  const publish = action("publish")
    .label("Runtime label")
    .form({ note: text() });
  const element = asVNode(
    RenderSchemaNode({
      node,
      values: { publish: { note: "Ready" } },
      actions: { publish },
    }),
  );
  const [tree, button] = childrenOf(element);
  const fieldVNode = asVNode(treeNodeAt(tree, 0));

  assert.equal(fieldVNode.props?.field.name, "note");
  assert.equal(childrenOf(button)[0], "Layout label");
});

test("action nodes use runtime labels when no layout label is set", () => {
  const node: ActionNode = { type: "action", name: "archive" };
  const archive = action("archive").label("Archive record");
  const element = asVNode(
    RenderSchemaNode({ node, values: {}, actions: { archive } }),
  );
  const [, button] = childrenOf(element);

  assert.equal(childrenOf(button)[0], "Archive record");
});

test("action nodes can render serialized runtime action schemas", () => {
  const node: ActionNode = { type: "action", name: "schedule" };
  const element = asVNode(
    RenderSchemaNode({
      node,
      values: { schedule: { note: "Later" } },
      actions: {
        schedule: {
          type: "action",
          name: "schedule",
          label: "Schedule",
          form: { note: text().toSchema("note") },
        },
      },
    }),
  );
  const [tree, button] = childrenOf(element);
  const fieldVNode = asVNode(treeNodeAt(tree, 0));

  assert.equal(fieldVNode.props?.field.name, "note");
  assert.equal(childrenOf(button)[0], "Schedule");
});

test("action nodes fall back to their name as the label with no input", () => {
  const node: ActionNode = { type: "action", name: "archive" };
  const element = asVNode(RenderSchemaNode({ node, values: {} }));
  const [tree, button] = childrenOf(element);

  assert.equal(tree, null);
  assert.equal(childrenOf(button)[0], "archive");
});

test("RenderSchemaTree maps every node with a stable, type-scoped key", () => {
  const nodes = [
    { type: "field", name: "title", fieldType: "text" } as FieldNode,
    { type: "section", title: "Extra", children: [] } as SectionNode,
    {
      type: "relationship",
      relationshipType: "belongsTo",
      resource: "users",
    } as RelationshipNode,
  ];
  const rendered = RenderSchemaTree({ nodes, values: { title: "Hi" } });

  assert.deepEqual(
    (rendered as VNode[]).map((fragment) => fragment.key),
    ["field:title", "section:1", "relationship:2"],
  );
});
