import assert from "node:assert/strict";
import test from "node:test";
import type { FieldSchema } from "@verikit/core";
import type { VNode } from "vue";
import {
  dateTimeFilterValue,
  dateTimeLocalInputValue,
  filterableFields,
  ResourceTableFilterPanel,
} from "../../src/resource/resource-table-filters.js";
import type { ResourceTableFilters } from "../../src/query/use-resource-table.js";
import {
  asVNode,
  childrenOf,
  renderComponent,
  type RawComponent,
} from "../support/vnode.js";

function field(patch: Partial<FieldSchema>): FieldSchema {
  return { type: "field", name: "title", fieldType: "text", ...patch };
}

/** Renders the internal filter-control component a `FilterControl` vnode points at. */
function unwrapControl(node: unknown): VNode {
  const vnode = asVNode(node);
  return renderComponent(
    vnode.type as RawComponent,
    vnode.props as Record<string, unknown>,
  );
}

/** Renders the panel and returns each filterable field's `[Label, FilterControl]` pair, keyed by field name. */
function panelControls(
  fields: Record<string, FieldSchema>,
  filters: ResourceTableFilters,
  onFiltersChange: (next: ResourceTableFilters) => void,
): Map<string, unknown> {
  const panel = renderComponent(ResourceTableFilterPanel, {
    fields,
    filters,
    onFiltersChange,
  });
  const entries = new Map<string, unknown>();

  // Position 0 is always the (possibly `null`) clear-filters wrapper; every
  // entry after it is one filterable field's `[Label, FilterControl]` div.
  for (const wrapper of childrenOf(panel).slice(1)) {
    const wrapperVNode = asVNode(wrapper);
    const [, control] = childrenOf(wrapperVNode);
    entries.set(String(wrapperVNode.key), control);
  }

  return entries;
}

test("filterableFields keeps only fields with filterable: true", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title", filterable: true }),
    body: field({ name: "body" }),
    views: field({ name: "views", fieldType: "number", filterable: true }),
  };

  assert.deepEqual(
    filterableFields(fields).map((f) => f.name),
    ["title", "views"],
  );
});

test("ResourceTableFilterPanel renders nothing when no field is filterable", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title" }),
  };

  const rendered = renderComponent(ResourceTableFilterPanel, {
    fields,
    filters: {},
    onFiltersChange: () => {},
  });

  assert.equal(rendered, null);
});

test("ResourceTableFilterPanel labels each control with the field's label, falling back to its name", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title", label: "Title", filterable: true }),
    views: field({ name: "views", fieldType: "number", filterable: true }),
  };
  const panel = renderComponent(ResourceTableFilterPanel, {
    fields,
    filters: {},
    onFiltersChange: () => {},
  });
  const wrappers = childrenOf(panel).slice(1);
  const [titleLabel] = childrenOf(wrappers[0]);
  const [viewsLabel] = childrenOf(wrappers[1]);

  assert.equal(childrenOf(titleLabel)[0], "Title");
  assert.equal(childrenOf(viewsLabel)[0], "views");
});

test("ResourceTableFilterPanel shows a compact clear button only for active filters", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title", filterable: true }),
  };
  const cleared: ResourceTableFilters[] = [];

  const inactive = renderComponent(ResourceTableFilterPanel, {
    fields,
    filters: {},
    onFiltersChange: (next: ResourceTableFilters) => cleared.push(next),
  });
  assert.equal(childrenOf(inactive)[0], null);

  const active = renderComponent(ResourceTableFilterPanel, {
    fields,
    filters: { title: { eq: "Ada" } },
    onFiltersChange: (next: ResourceTableFilters) => cleared.push(next),
  });
  const clearWrapper = childrenOf(active)[0];
  const [button] = childrenOf(clearWrapper);
  const buttonVNode = asVNode(button);

  assert.equal(childrenOf(buttonVNode)[0], "Clear filters");
  assert.equal(buttonVNode.props?.size, "xs");
  assert.equal(buttonVNode.props?.variant, "ghost");
  (buttonVNode.props?.onClick as () => void)();
  assert.deepEqual(cleared, [{}]);
});

test("boolean filter control reflects the active filter and reports Yes/No/All", () => {
  const fields: Record<string, FieldSchema> = {
    active: field({ name: "active", fieldType: "boolean", filterable: true }),
  };
  const calls: ResourceTableFilters[] = [];
  const controls = panelControls(fields, {}, (next) => calls.push(next));
  const select = unwrapControl(controls.get("active"));

  assert.equal(select.props?.value, "__all__");

  const onValueChange = select.props?.onValueChange as (
    value: string | null,
  ) => void;
  onValueChange("true");
  onValueChange("false");
  onValueChange("__all__");
  assert.deepEqual(calls, [
    { active: { eq: true } },
    { active: { eq: false } },
    {},
  ]);

  const [trigger, content] = childrenOf(select);
  const [value] = childrenOf(trigger);
  assert.equal(asVNode(value).props?.placeholder, "All");
  const items = childrenOf(content).map((item) => childrenOf(item)[0]);
  assert.deepEqual(items, ["All", "Yes", "No"]);
});

test("boolean filter control's displayed value reflects an existing true/false filter", () => {
  const fields: Record<string, FieldSchema> = {
    active: field({ name: "active", fieldType: "boolean", filterable: true }),
  };

  const trueControl = unwrapControl(
    panelControls(fields, { active: { eq: true } }, () => {}).get("active"),
  );
  assert.equal(trueControl.props?.value, "true");

  const falseControl = unwrapControl(
    panelControls(fields, { active: { eq: false } }, () => {}).get("active"),
  );
  assert.equal(falseControl.props?.value, "false");
});

test("select filter control maps option values back, falling back to the raw key for an unmapped one", () => {
  const fields: Record<string, FieldSchema> = {
    status: field({
      name: "status",
      fieldType: "select",
      filterable: true,
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: 1 },
      ],
    }),
  };
  const calls: ResourceTableFilters[] = [];
  const controls = panelControls(fields, { status: { eq: 1 } }, (next) =>
    calls.push(next),
  );
  const select = unwrapControl(controls.get("status"));

  assert.equal(select.props?.value, "1");

  const onValueChange = select.props?.onValueChange as (
    value: string | null,
  ) => void;
  onValueChange(null);
  onValueChange("__all__");
  onValueChange("draft");
  onValueChange("1");
  onValueChange("missing");
  assert.deepEqual(calls, [
    {},
    {},
    { status: { eq: "draft" } },
    { status: { eq: 1 } },
    { status: { eq: "missing" } },
  ]);

  const [trigger, content] = childrenOf(select);
  const [value] = childrenOf(trigger);
  assert.equal(asVNode(value).props?.placeholder, "All");
  const items = childrenOf(content).map((item) => childrenOf(item)[0]);
  assert.deepEqual(items, ["All", "Draft", "Published"]);
});

test("select filter control displays All with no active filter, and tolerates a field with no options declared", () => {
  const fields: Record<string, FieldSchema> = {
    status: field({ name: "status", fieldType: "select", filterable: true }),
  };
  const select = unwrapControl(
    panelControls(fields, {}, () => {}).get("status"),
  );

  assert.equal(select.props?.value, "__all__");
});

test("a number field's range control coerces its min/max to numbers and clears when both are emptied", () => {
  const fields: Record<string, FieldSchema> = {
    views: field({ name: "views", fieldType: "number", filterable: true }),
  };
  const calls: ResourceTableFilters[] = [];
  const controls = panelControls(
    fields,
    { views: { gte: 5, lte: 10 } },
    (next) => calls.push(next),
  );
  const range = unwrapControl(controls.get("views"));
  const [minInput, , maxInput] = childrenOf(range);
  const minVNode = asVNode(minInput);
  const maxVNode = asVNode(maxInput);

  assert.equal(minVNode.props?.type, "number");
  assert.equal(minVNode.props?.value, "5");
  assert.equal(maxVNode.props?.value, "10");

  (minVNode.props?.onInput as (event: unknown) => void)({
    target: { value: "7" },
  });
  assert.deepEqual(calls.at(-1), { views: { gte: 7, lte: 10 } });

  // Clearing min alone leaves max as this render still knows it (10);
  // clearing max requires a fresh render off that result to prove the
  // control reads the *current* filter value, not a stale closure.
  (minVNode.props?.onInput as (event: unknown) => void)({
    target: { value: "" },
  });
  assert.deepEqual(calls.at(-1), { views: { lte: 10 } });

  const nextRange = unwrapControl(
    panelControls(fields, calls.at(-1)!, (next) => calls.push(next)).get(
      "views",
    ),
  );
  const [, , nextMaxInput] = childrenOf(nextRange);
  (asVNode(nextMaxInput).props?.onInput as (event: unknown) => void)({
    target: { value: "" },
  });
  assert.deepEqual(calls.at(-1), {});
});

test("date fields retain date strings while datetime bounds are normalized to UTC ISO", () => {
  const fields: Record<string, FieldSchema> = {
    startsOn: field({ name: "startsOn", fieldType: "date", filterable: true }),
    startsAt: field({
      name: "startsAt",
      fieldType: "datetime",
      filterable: true,
    }),
  };
  const calls: ResourceTableFilters[] = [];
  const controls = panelControls(fields, {}, (next) => calls.push(next));

  const dateRange = unwrapControl(controls.get("startsOn"));
  const [dateMin] = childrenOf(dateRange);
  const dateMinVNode = asVNode(dateMin);
  assert.equal(dateMinVNode.props?.type, "date");
  (dateMinVNode.props?.onInput as (event: unknown) => void)({
    target: { value: "2026-01-01" },
  });
  assert.deepEqual(calls.at(-1), { startsOn: { gte: "2026-01-01" } });

  const datetimeRange = unwrapControl(controls.get("startsAt"));
  const [datetimeMin] = childrenOf(datetimeRange);
  const datetimeMinVNode = asVNode(datetimeMin);
  assert.equal(datetimeMinVNode.props?.type, "datetime-local");

  (datetimeMinVNode.props?.onInput as (event: unknown) => void)({
    target: { value: "2026-08-05T10:45" },
  });
  assert.deepEqual(calls.at(-1), {
    startsAt: { gte: new Date("2026-08-05T10:45").toISOString() },
  });

  const nextDatetimeRange = unwrapControl(
    panelControls(fields, calls.at(-1)!, (next) => calls.push(next)).get(
      "startsAt",
    ),
  );
  const [nextDatetimeMin, , nextDatetimeMax] = childrenOf(nextDatetimeRange);
  (asVNode(nextDatetimeMax).props?.onInput as (event: unknown) => void)({
    target: { value: "2026-08-12T10:45" },
  });
  assert.deepEqual(calls.at(-1), {
    startsAt: {
      gte: new Date("2026-08-05T10:45").toISOString(),
      lte: new Date("2026-08-12T10:45").toISOString(),
    },
  });
  assert.equal(asVNode(nextDatetimeMin).props?.type, "datetime-local");
});

test("dateTimeFilterValue drops empty and invalid browser values", () => {
  assert.equal(dateTimeFilterValue(""), undefined);
  assert.equal(dateTimeFilterValue("not-a-datetime"), undefined);
  assert.equal(
    dateTimeFilterValue("2026-08-05T10:45"),
    new Date("2026-08-05T10:45").toISOString(),
  );
});

test("dateTimeLocalInputValue formats stored UTC filters for datetime-local controls", () => {
  const input = "2026-08-05T10:45";
  assert.equal(dateTimeLocalInputValue(dateTimeFilterValue(input)!), input);
  assert.equal(dateTimeLocalInputValue("not-a-datetime"), "not-a-datetime");
});

test("datetime range controls omit malformed bounds instead of forwarding them to an adapter", () => {
  const fields: Record<string, FieldSchema> = {
    startsAt: field({
      name: "startsAt",
      fieldType: "datetime",
      filterable: true,
    }),
  };
  const calls: ResourceTableFilters[] = [];
  const range = unwrapControl(
    panelControls(fields, {}, (next) => calls.push(next)).get("startsAt"),
  );
  const [minInput, , maxInput] = childrenOf(range);

  (asVNode(minInput).props?.onInput as (event: unknown) => void)({
    target: { value: "not-a-datetime" },
  });
  (asVNode(maxInput).props?.onInput as (event: unknown) => void)({
    target: { value: "not-a-datetime" },
  });

  assert.deepEqual(calls, [{}, {}]);
});

test("range controls constrain and reject an inverted from/to range", () => {
  const fields: Record<string, FieldSchema> = {
    startsAt: field({
      name: "startsAt",
      fieldType: "datetime",
      filterable: true,
    }),
  };
  const calls: ResourceTableFilters[] = [];
  const range = unwrapControl(
    panelControls(
      fields,
      {
        startsAt: {
          gte: dateTimeFilterValue("2026-08-05T10:45"),
          lte: dateTimeFilterValue("2026-08-12T10:45"),
        },
      },
      (next) => calls.push(next),
    ).get("startsAt"),
  );
  const [minInput, , maxInput] = childrenOf(range);
  const minVNode = asVNode(minInput);
  const maxVNode = asVNode(maxInput);

  assert.equal(maxVNode.props?.min, "2026-08-05T10:45");
  assert.equal(minVNode.props?.max, "2026-08-12T10:45");

  (maxVNode.props?.onInput as (event: unknown) => void)({
    target: { value: "2026-08-04T10:45" },
  });
  assert.deepEqual(calls, []);
});

test("text filter control sets an exact-match filter and clears it when emptied", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title", filterable: true }),
  };
  const calls: ResourceTableFilters[] = [];
  const controls = panelControls(fields, { title: { eq: "Hello" } }, (next) =>
    calls.push(next),
  );
  const input = unwrapControl(controls.get("title"));

  assert.equal(input.props?.value, "Hello");

  (input.props?.onInput as (event: unknown) => void)({
    target: { value: "World" },
  });
  assert.deepEqual(calls.at(-1), { title: { eq: "World" } });

  (input.props?.onInput as (event: unknown) => void)({ target: { value: "" } });
  assert.deepEqual(calls.at(-1), {});
});

test("changing one field's filter leaves the others in the merged filter set untouched", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title", filterable: true }),
    views: field({ name: "views", fieldType: "number", filterable: true }),
  };
  const calls: ResourceTableFilters[] = [];
  const controls = panelControls(fields, { views: { gte: 5 } }, (next) =>
    calls.push(next),
  );
  const titleInput = unwrapControl(controls.get("title"));

  (titleInput.props?.onInput as (event: unknown) => void)({
    target: { value: "Hello" },
  });
  assert.deepEqual(calls.at(-1), { views: { gte: 5 }, title: { eq: "Hello" } });
});
