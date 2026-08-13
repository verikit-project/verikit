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
import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getValueAtPath,
  pathKey,
  RenderSchemaNode,
  RenderSchemaTree,
  setValueAtPath,
} from "../../src/layout/index.js";
// hasValueAtPath/unsetValueAtPath are internal helpers used by the
// schema-tree form bridge (the former to tell "cleared to undefined" apart
// from "never touched", the latter to drop a readOnly field's value) and
// deliberately aren't part of layout/index.js's public surface.
import { hasValueAtPath, unsetValueAtPath } from "../../src/layout/path.js";

type AnyElement = ReactElement<Record<string, unknown>>;

function asElement(value: unknown): AnyElement {
  assert.equal(isValidElement(value), true);

  return value as AnyElement;
}

function childrenOf(element: AnyElement): unknown[] {
  return Array.isArray(element.props.children)
    ? element.props.children
    : [element.props.children];
}

test("getValueAtPath resolves nested paths and pathKey joins them", () => {
  const source = { a: { b: [{ c: 1 }, { c: 2 }] } };

  assert.equal(getValueAtPath(source, ["a", "b", 1, "c"]), 2);
  assert.equal(getValueAtPath(source, ["a", "missing", "c"]), undefined);
  assert.equal(getValueAtPath(null, ["a"]), undefined);
  assert.equal(getValueAtPath(undefined, ["a"]), undefined);
  assert.equal(pathKey(["a", 1, "c"]), "a.1.c");
  assert.equal(pathKey([]), "");
});

test("hasValueAtPath distinguishes an absent key from a value of undefined", () => {
  const source = { a: { b: undefined, c: 1 }, list: [0] };

  assert.equal(hasValueAtPath(source, []), true);
  assert.equal(hasValueAtPath(source, ["a", "b"]), true);
  assert.equal(hasValueAtPath(source, ["a", "missing"]), false);
  assert.equal(hasValueAtPath(source, ["a", "c", "d"]), false);
  assert.equal(hasValueAtPath(null, ["a"]), false);
  assert.equal(hasValueAtPath(source, ["list", 0]), true);
  assert.equal(hasValueAtPath(source, ["list", 1]), false);
});

test("setValueAtPath clones containers along the path without mutating the source", () => {
  const source = { a: { b: [{ c: 1 }, { c: 2 }] } };

  const updated = setValueAtPath(
    source,
    ["a", "b", 1, "c"],
    9,
  ) as typeof source;
  assert.equal(updated.a.b[1]?.c, 9);
  assert.equal(source.a.b[1]?.c, 2);
  assert.notEqual(updated, source);
  assert.equal(updated.a.b[0], source.a.b[0]);

  assert.deepEqual(setValueAtPath(undefined, ["items", 0, "name"], "x"), {
    items: [{ name: "x" }],
  });
  assert.deepEqual(setValueAtPath({ a: 1 }, [], { b: 2 }), { b: 2 });
});

test("unsetValueAtPath removes a key without mutating the source, and is a no-op when there's nothing to remove", () => {
  const source = { a: { b: 1, c: 2 }, items: [{ name: "x" }, { name: "y" }] };

  const updated = unsetValueAtPath(source, ["a", "b"]) as typeof source;
  assert.deepEqual(updated.a, { c: 2 });
  assert.deepEqual(source.a, { b: 1, c: 2 });
  assert.notEqual(updated, source);
  assert.equal(updated.items, source.items);

  // Nested inside an array container (e.g. a readOnly field inside a
  // repeater row): only the targeted row is cloned, its siblings untouched.
  const updatedNested = unsetValueAtPath(source, [
    "items",
    0,
    "name",
  ]) as typeof source;
  assert.deepEqual(updatedNested.items[0], {});
  assert.equal(updatedNested.items[1], source.items[1]);

  // An empty path, a non-object source (including `null`, whose `typeof` is
  // famously `"object"`), and a terminal path segment landing on an array
  // are all no-ops: schema-tree field paths never terminate on an array in
  // practice (a field name is always the last segment), but the function
  // stays a safe no-op rather than corrupting an array by "deleting" an
  // index from it.
  assert.equal(unsetValueAtPath(source, []), source);
  assert.equal(unsetValueAtPath(null, ["a"]), null);
  assert.equal(unsetValueAtPath(42, ["a"]), 42);
  const array = [1, 2, 3];
  assert.equal(unsetValueAtPath(array, ["0"]), array);

  // A missing intermediate container still clones its way down (mirroring
  // `setValueAtPath`'s own permissive style) rather than special-casing the
  // miss; the walk simply has nothing to remove once it gets there.
  assert.deepEqual(unsetValueAtPath({ a: 1 }, ["missing", "b"]), {
    a: 1,
    missing: undefined,
  });
});

test("field nodes read nested values via path and forward change/blur paths", () => {
  const node: FieldNode = { type: "field", name: "email", fieldType: "email" };
  const changes: unknown[] = [];
  const blurs: unknown[] = [];
  const element = asElement(
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

  assert.equal(element.props.field, node);
  assert.equal(element.props.value, "a@b.com");
  assert.equal(element.props.error, "Invalid");
  assert.equal(element.props.className, "col-span-2");
  (element.props.onValueChange as (value: unknown) => void)("next@b.com");
  (element.props.onBlur as () => void)();
  assert.deepEqual(changes, [[["contacts", 1, "email"], "next@b.com"]]);
  assert.deepEqual(blurs, [["contacts", 1, "email"]]);
});

test("field nodes default to an empty path when none is given", () => {
  const node: FieldNode = { type: "field", name: "title", fieldType: "text" };
  const element = asElement(
    RenderSchemaNode({ node, values: { title: "Hello" } }),
  );

  assert.equal(element.props.value, "Hello");
  assert.equal(element.props.error, undefined);
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
      return <span>{relationship.resource}</span>;
    },
  });
  const html = renderToStaticMarkup(rendered as ReactElement);

  assert.match(html, /users/);
  assert.deepEqual(seen, [["users", ["post"]]]);
});

test("section nodes render a title and recurse into children with an inherited path", () => {
  const node: SectionNode = {
    type: "section",
    title: "Profile",
    children: [{ type: "field", name: "title", fieldType: "text" }],
  };
  const element = asElement(
    RenderSchemaNode({ node, values: {}, path: ["a"], className: "extra" }),
  );

  assert.equal(element.type, "section");
  assert.match(String(element.props.className), /extra/);

  const [heading, tree] = childrenOf(element);
  assert.equal(childrenOf(asElement(heading))[0], "Profile");

  const treeElement = asElement(tree);
  assert.equal(treeElement.props.nodes, node.children);
  assert.deepEqual(treeElement.props.path, ["a"]);
});

test("grid nodes set a column-count style and recurse into children", () => {
  const node: GridNode = {
    type: "grid",
    columns: 3,
    children: [{ type: "field", name: "title", fieldType: "text" }],
  };
  const element = asElement(RenderSchemaNode({ node, values: {} }));

  assert.deepEqual(element.props.style, {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  });

  const [tree] = childrenOf(element);
  assert.equal(asElement(tree).props.nodes, node.children);
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
  const element = asElement(
    RenderSchemaNode({
      node,
      values: {},
      activeTab: 1,
      onActiveTabChange: (index) => changes.push(index),
    }),
  );
  const [tabList, panel] = childrenOf(element);
  const buttons = childrenOf(asElement(tabList)).map((child) =>
    asElement(child),
  );

  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].props["aria-selected"], false);
  assert.equal(buttons[1].props["aria-selected"], true);
  assert.equal(buttons[0].props.variant, "ghost");
  assert.equal(buttons[1].props.variant, "secondary");
  (buttons[0].props.onClick as () => void)();
  assert.deepEqual(changes, [0]);

  const [tree] = childrenOf(asElement(panel));
  assert.equal(asElement(tree).props.nodes, node.tabs[1]?.children);
});

test("tabs clamp an out-of-range active index and render nothing with no tabs", () => {
  const node: TabsNode = {
    type: "tabs",
    tabs: [{ title: "Only", children: [] }],
  };
  const clamped = asElement(
    RenderSchemaNode({ node, values: {}, activeTab: 5 }),
  );
  const [, panel] = childrenOf(clamped);
  assert.notEqual(panel, null);

  const empty = asElement(
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
  const first = asElement(
    RenderSchemaNode({
      node,
      values: {},
      activeStep: 0,
      onActiveStepChange: (index) => changes.push(index),
    }),
  );
  const [stepList, , nav] = childrenOf(first);
  const items = childrenOf(asElement(stepList)).map((item) => asElement(item));

  assert.equal(items[0].props["aria-current"], "step");
  assert.equal(items[1].props["aria-current"], undefined);

  const [back, next] = childrenOf(asElement(nav)).map((button) =>
    asElement(button),
  );
  assert.equal(back.props.disabled, true);
  assert.equal(next.props.disabled, false);
  (back.props.onClick as () => void)();
  (next.props.onClick as () => void)();
  assert.deepEqual(changes, [-1, 1]);

  const last = asElement(RenderSchemaNode({ node, values: {}, activeStep: 1 }));
  const [, , lastNav] = childrenOf(last);
  const [lastBack, lastNext] = childrenOf(asElement(lastNav)).map((button) =>
    asElement(button),
  );
  assert.equal(lastBack.props.disabled, false);
  assert.equal(lastNext.props.disabled, true);
});

test("wizard with no steps renders no step content", () => {
  const element = asElement(
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
  const element = asElement(
    RenderSchemaNode({
      node,
      values: { tags: [{ label: "a" }, { label: "b" }] },
      onRepeaterAdd: (path) => added.push(path),
      onRepeaterRemove: (path, index) => removed.push([path, index]),
    }),
  );
  const [rows, addButton] = childrenOf(element) as [AnyElement[], unknown];
  assert.equal(rows.length, 2);

  const row0 = asElement(rows[0]);
  const [tree0, removeButton0] = childrenOf(row0).map((child) =>
    asElement(child),
  );
  assert.deepEqual(tree0.props.path, ["tags", 0]);
  assert.equal(tree0.props.nodes, node.children);
  (removeButton0.props.onClick as () => void)();
  assert.deepEqual(removed, [[["tags"], 0]]);

  (asElement(addButton).props.onClick as () => void)();
  assert.deepEqual(added, [["tags"]]);
});

test("repeater rows use getRepeaterRowKey when supplied, falling back to index otherwise", () => {
  const node: RepeaterNode = {
    type: "repeater",
    name: "tags",
    children: [],
  };
  const values = { tags: [{ label: "a" }, { label: "b" }] };

  const withoutKeySource = asElement(RenderSchemaNode({ node, values }));
  const [defaultRows] = childrenOf(withoutKeySource) as [AnyElement[], unknown];
  assert.deepEqual(
    defaultRows.map((row) => row.key),
    ["0", "1"],
  );

  const seen: Array<[readonly unknown[], number]> = [];
  const withKeySource = asElement(
    RenderSchemaNode({
      node,
      values,
      getRepeaterRowKey: (path, index) => {
        seen.push([path, index]);
        return `row-${index}`;
      },
    }),
  );
  const [keyedRows] = childrenOf(withKeySource) as [AnyElement[], unknown];

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
  const element = asElement(RenderSchemaNode({ node, values: {} }));
  const [rows, addButton] = childrenOf(element) as [unknown[], unknown];

  assert.deepEqual(rows, []);
  assert.equal(isValidElement(addButton), true);
});

test("action nodes render their input fields and report the click", () => {
  const node: ActionNode = {
    type: "action",
    name: "publish",
    label: "Publish now",
    input: [{ type: "field", name: "reason", fieldType: "text" }],
  };
  const clicks: unknown[] = [];
  const element = asElement(
    RenderSchemaNode({
      node,
      values: {},
      path: ["post"],
      onAction: (name, path) => clicks.push([name, path]),
    }),
  );
  const [tree, button] = childrenOf(element);

  assert.deepEqual(asElement(tree).props.path, ["post", "publish"]);
  assert.equal(childrenOf(asElement(button))[0], "Publish now");
  (asElement(button).props.onClick as () => void)();
  assert.deepEqual(clicks, [["publish", ["post", "publish"]]]);
});

test("action nodes can render runtime action forms by name", () => {
  const node: ActionNode = {
    type: "action",
    name: "publish",
    label: "Layout label",
    input: [{ type: "field", name: "layoutOnly", fieldType: "text" }],
  };
  const publish = action("publish").label("Runtime label").form({
    note: text(),
  });
  const element = asElement(
    RenderSchemaNode({
      node,
      values: { publish: { note: "Ready" } },
      actions: { publish },
    }),
  );
  const [tree, button] = childrenOf(element);
  const treeElement = asElement(tree);

  assert.deepEqual(treeElement.props.path, ["publish"]);
  assert.deepEqual(treeElement.props.nodes, [
    { type: "field", name: "note", fieldType: "text" },
  ]);
  assert.equal(childrenOf(asElement(button))[0], "Layout label");
});

test("action nodes use runtime labels when no layout label is set", () => {
  const node: ActionNode = { type: "action", name: "archive" };
  const archive = action("archive").label("Archive record");
  const element = asElement(
    RenderSchemaNode({ node, values: {}, actions: { archive } }),
  );
  const [, button] = childrenOf(element);

  assert.equal(childrenOf(asElement(button))[0], "Archive record");
});

test("action nodes can render serialized runtime action schemas", () => {
  const node: ActionNode = { type: "action", name: "schedule" };
  const element = asElement(
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

  assert.deepEqual(asElement(tree).props.nodes, [
    { type: "field", name: "note", fieldType: "text" },
  ]);
  assert.equal(childrenOf(asElement(button))[0], "Schedule");
});

test("action nodes fall back to their name as the label with no input", () => {
  const node: ActionNode = { type: "action", name: "archive" };
  const element = asElement(RenderSchemaNode({ node, values: {} }));
  const [tree, button] = childrenOf(element);

  assert.equal(tree, null);
  assert.equal(childrenOf(asElement(button))[0], "archive");
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
  const rendered = asElement(
    RenderSchemaTree({ nodes, values: { title: "Hi" } }),
  );
  const elements = childrenOf(rendered).map((child) => asElement(child));

  assert.deepEqual(
    elements.map((element) => element.key),
    ["field:title", "section:1", "relationship:2"],
  );
});

test("a full section-of-fields tree renders end to end", () => {
  const tree: SectionNode = {
    type: "section",
    title: "Basics",
    children: [
      { type: "field", name: "title", fieldType: "text", label: "Title" },
      { type: "field", name: "published", fieldType: "boolean" },
    ],
  };
  const html = renderToStaticMarkup(
    <RenderSchemaTree
      nodes={[tree]}
      values={{ title: "Hello", published: true }}
    />,
  );

  assert.match(html, /Basics/);
  assert.match(html, /Title/);
  assert.match(html, /data-slot="input"/);
  assert.match(html, /data-slot="checkbox"/);
});
