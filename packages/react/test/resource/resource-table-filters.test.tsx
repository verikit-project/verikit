import assert from "node:assert/strict";
import test from "node:test";
import type { FieldSchema } from "@verikit/core";
import { isValidElement, type ReactElement } from "react";
import {
  dateTimeFilterValue,
  dateTimeLocalInputValue,
  filterableFields,
  ResourceTableFilterPanel,
} from "../../src/resource/resource-table-filters.js";
import type { ResourceTableFilters } from "../../src/query/use-resource-table.js";

type AnyElement = ReactElement<Record<string, unknown>>;

function field(patch: Partial<FieldSchema>): FieldSchema {
  return {
    type: "field",
    name: "title",
    fieldType: "text",
    ...patch,
  };
}

function asElement(value: unknown): AnyElement {
  assert.equal(isValidElement(value), true);

  return value as AnyElement;
}

function invoke(element: AnyElement): AnyElement {
  assert.equal(typeof element.type, "function");
  const component = element.type as (props: Record<string, unknown>) => unknown;

  return asElement(component(element.props));
}

/** Unwraps `FilterControl`'s dispatcher down to the concrete control it renders (a `Select`, `Input`, or an `Input`-pair `div`), without invoking that final host-level element itself. */
function unwrapControl(element: AnyElement): AnyElement {
  return invoke(invoke(element));
}

function childrenOf(element: AnyElement): AnyElement[] {
  const children = element.props.children;
  return (Array.isArray(children) ? children.flat() : [children]).filter(
    isValidElement,
  ) as AnyElement[];
}

/** Renders the panel and returns each filterable field's `[Label, FilterControl]` pair, keyed by field name. */
function panelControls(
  fields: Record<string, FieldSchema>,
  filters: ResourceTableFilters,
  onFiltersChange: (next: ResourceTableFilters) => void,
): Map<string, AnyElement> {
  const panel = asElement(
    ResourceTableFilterPanel({ fields, filters, onFiltersChange }),
  );
  const entries = new Map<string, AnyElement>();

  for (const wrapper of childrenOf(panel)) {
    const [, control] = childrenOf(wrapper);
    entries.set(wrapper.key as string, control!);
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

  assert.equal(
    ResourceTableFilterPanel({
      fields,
      filters: {},
      onFiltersChange: () => {},
    }),
    null,
  );
});

test("ResourceTableFilterPanel labels each control with the field's label, falling back to its name", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title", label: "Title", filterable: true }),
    views: field({ name: "views", fieldType: "number", filterable: true }),
  };
  const panel = asElement(
    ResourceTableFilterPanel({
      fields,
      filters: {},
      onFiltersChange: () => {},
    }),
  );
  const [titleWrapper, viewsWrapper] = childrenOf(panel);
  const [titleLabel] = childrenOf(titleWrapper!);
  const [viewsLabel] = childrenOf(viewsWrapper!);

  assert.equal(titleLabel!.props.children, "Title");
  assert.equal(viewsLabel!.props.children, "views");
});

test("ResourceTableFilterPanel shows a compact clear button only for active filters", () => {
  const fields: Record<string, FieldSchema> = {
    title: field({ name: "title", filterable: true }),
  };
  const cleared: ResourceTableFilters[] = [];
  const inactive = asElement(
    ResourceTableFilterPanel({
      fields,
      filters: {},
      onFiltersChange: (next) => cleared.push(next),
    }),
  );
  assert.equal(
    childrenOf(inactive).some(
      (child) => child?.props.children === "Clear filters",
    ),
    false,
  );

  const active = asElement(
    ResourceTableFilterPanel({
      fields,
      filters: { title: { eq: "Ada" } },
      onFiltersChange: (next) => cleared.push(next),
    }),
  );
  const clearWrapper = childrenOf(active)[0]!;
  const button = asElement(clearWrapper.props.children);

  assert.equal(button.props.children, "Clear filters");
  assert.equal(button.props.size, "xs");
  assert.equal(button.props.variant, "ghost");
  (button.props.onClick as () => void)();
  assert.deepEqual(cleared, [{}]);
});

test("boolean filter control reflects the active filter and reports Yes/No/All", () => {
  const fields: Record<string, FieldSchema> = {
    active: field({ name: "active", fieldType: "boolean", filterable: true }),
  };
  const calls: ResourceTableFilters[] = [];
  const controls = panelControls(fields, {}, (next) => calls.push(next));
  const select = unwrapControl(controls.get("active")!);

  assert.equal(select.props.value, "__all__");

  (select.props.onValueChange as (value: string | null) => void)("true");
  (select.props.onValueChange as (value: string | null) => void)("false");
  (select.props.onValueChange as (value: string | null) => void)("__all__");
  assert.deepEqual(calls, [
    { active: { eq: true } },
    { active: { eq: false } },
    {},
  ]);
});

test("boolean filter control's displayed value reflects an existing true/false filter", () => {
  const fields: Record<string, FieldSchema> = {
    active: field({ name: "active", fieldType: "boolean", filterable: true }),
  };

  const trueControl = unwrapControl(
    panelControls(fields, { active: { eq: true } }, () => {}).get("active")!,
  );
  assert.equal(trueControl.props.value, "true");

  const falseControl = unwrapControl(
    panelControls(fields, { active: { eq: false } }, () => {}).get("active")!,
  );
  assert.equal(falseControl.props.value, "false");
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
  const select = unwrapControl(controls.get("status")!);

  // An existing numeric filter value displays as its string form.
  assert.equal(select.props.value, "1");

  (select.props.onValueChange as (value: string | null) => void)(null);
  (select.props.onValueChange as (value: string | null) => void)("__all__");
  (select.props.onValueChange as (value: string | null) => void)("draft");
  (select.props.onValueChange as (value: string | null) => void)("1");
  (select.props.onValueChange as (value: string | null) => void)("missing");
  assert.deepEqual(calls, [
    {},
    {},
    { status: { eq: "draft" } },
    { status: { eq: 1 } },
    { status: { eq: "missing" } },
  ]);
});

test("select filter control displays All with no active filter, and tolerates a field with no options declared", () => {
  const fields: Record<string, FieldSchema> = {
    status: field({ name: "status", fieldType: "select", filterable: true }),
  };
  const select = unwrapControl(
    panelControls(fields, {}, () => {}).get("status")!,
  );

  assert.equal(select.props.value, "__all__");
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
  const range = unwrapControl(controls.get("views")!);
  const [minInput, , maxInput] = childrenOf(range);

  assert.equal(minInput!.props.type, "number");
  assert.equal(minInput!.props.value, "5");
  assert.equal(maxInput!.props.value, "10");

  (minInput!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "7" },
  });
  assert.deepEqual(calls.at(-1), { views: { gte: 7, lte: 10 } });

  // Clearing min alone leaves max as this render still knows it (10);
  // clearing max requires a fresh render off that result to prove the
  // control reads the *current* filter value, not a stale closure.
  (minInput!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "" },
  });
  assert.deepEqual(calls.at(-1), { views: { lte: 10 } });

  const nextRange = unwrapControl(
    panelControls(fields, calls.at(-1)!, (next) => calls.push(next)).get(
      "views",
    )!,
  );
  const [, , nextMaxInput] = childrenOf(nextRange);
  (nextMaxInput!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "" },
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

  const dateRange = unwrapControl(controls.get("startsOn")!);
  const [dateMin] = childrenOf(dateRange);
  assert.equal(dateMin!.props.type, "date");
  (dateMin!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "2026-01-01" },
  });
  assert.deepEqual(calls.at(-1), { startsOn: { gte: "2026-01-01" } });

  const datetimeRange = unwrapControl(controls.get("startsAt")!);
  const [datetimeMin] = childrenOf(datetimeRange);
  assert.equal(datetimeMin!.props.type, "datetime-local");

  (datetimeMin!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "2026-08-05T10:45" },
  });
  assert.deepEqual(calls.at(-1), {
    startsAt: { gte: new Date("2026-08-05T10:45").toISOString() },
  });

  const nextDatetimeRange = unwrapControl(
    panelControls(fields, calls.at(-1)!, (next) => calls.push(next)).get(
      "startsAt",
    )!,
  );
  const [nextDatetimeMin, , nextDatetimeMax] = childrenOf(nextDatetimeRange);
  (nextDatetimeMax!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "2026-08-12T10:45" },
  });
  assert.deepEqual(calls.at(-1), {
    startsAt: {
      gte: new Date("2026-08-05T10:45").toISOString(),
      lte: new Date("2026-08-12T10:45").toISOString(),
    },
  });
  assert.equal(nextDatetimeMin!.props.type, "datetime-local");
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
    panelControls(fields, {}, (next) => calls.push(next)).get("startsAt")!,
  );
  const [minInput, , maxInput] = childrenOf(range);

  (minInput!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "not-a-datetime" },
  });
  (maxInput!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "not-a-datetime" },
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
    ).get("startsAt")!,
  );
  const [minInput, , maxInput] = childrenOf(range);

  assert.equal(maxInput!.props.min, "2026-08-05T10:45");
  assert.equal(minInput!.props.max, "2026-08-12T10:45");

  (maxInput!.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "2026-08-04T10:45" },
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
  const input = unwrapControl(controls.get("title")!);

  assert.equal(input.props.value, "Hello");

  (input.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "World" },
  });
  assert.deepEqual(calls.at(-1), { title: { eq: "World" } });

  (input.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "" },
  });
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
  const titleInput = unwrapControl(controls.get("title")!);

  (titleInput.props.onChange as (event: unknown) => void)({
    currentTarget: { value: "Hello" },
  });
  assert.deepEqual(calls.at(-1), {
    views: { gte: 5 },
    title: { eq: "Hello" },
  });
});
