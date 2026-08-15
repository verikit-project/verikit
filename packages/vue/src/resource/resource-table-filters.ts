import type { FieldSchema } from "@verikit/core";
import { defineComponent, h, type PropType, type VNode } from "vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/select";
import { Button } from "#components/button";
import { Input } from "#components/input";
import { Label } from "#components/label";
import type { ResourceTableFilters } from "../query/use-resource-table.js";

type FieldFilter = ResourceTableFilters[string];

/** Fields a filter panel should render a control for. */
export function filterableFields(
  fields: Record<string, FieldSchema>,
): FieldSchema[] {
  return Object.values(fields).filter((field) => field.filterable);
}

const ALL_VALUE = "__all__";

/** Converts a browser `datetime-local` value into the UTC ISO format adapters expect. */
export function dateTimeFilterValue(value: string): string | undefined {
  if (value === "") return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Formats a stored datetime filter for a browser `datetime-local` input. */
export function dateTimeLocalInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isOrderedRange(
  min: string | number | undefined,
  max: string | number | undefined,
): boolean {
  if (min === undefined || max === undefined) return true;

  return typeof min === "number" && typeof max === "number"
    ? min <= max
    : String(min) <= String(max);
}

function filterControlProps() {
  return {
    field: { type: Object as PropType<FieldSchema>, required: true as const },
    value: {
      type: Object as unknown as PropType<FieldFilter | undefined>,
      required: false,
    },
    onChange: {
      type: Function as PropType<(next: FieldFilter | undefined) => void>,
      required: true as const,
    },
  };
}

/** A boolean field's tri-state filter: unset, true, or false. */
const BooleanFilterControl = defineComponent({
  name: "BooleanFilterControl",
  props: filterControlProps(),
  setup(props) {
    return () => {
      const current =
        props.value?.eq === true ? "true" : props.value?.eq === false ? "false" : ALL_VALUE;

      return h(
        Select,
        {
          value: current,
          onValueChange: (next: string | null) => {
            if (next === "true") {
              props.onChange({ eq: true });
            } else if (next === "false") {
              props.onChange({ eq: false });
            } else {
              props.onChange(undefined);
            }
          },
        },
        {
          default: () => [
            h(
              SelectTrigger,
              { class: "w-full", "aria-label": props.field.label ?? props.field.name },
              { default: () => h(SelectValue, { placeholder: "All" }) },
            ),
            h(SelectContent, {}, {
              default: () => [
                h(SelectItem, { value: ALL_VALUE }, { default: () => "All" }),
                h(SelectItem, { value: "true" }, { default: () => "Yes" }),
                h(SelectItem, { value: "false" }, { default: () => "No" }),
              ],
            }),
          ],
        },
      );
    };
  },
});

/** A select field's filter: unset, or exact match against one of its options. */
const SelectFilterControl = defineComponent({
  name: "SelectFilterControl",
  props: filterControlProps(),
  setup(props) {
    return () => {
      const options = props.field.options ?? [];
      const valuesByKey = new Map(
        options.map((option) => [String(option.value), option.value]),
      );
      const current = props.value?.eq === undefined ? ALL_VALUE : String(props.value.eq);

      return h(
        Select,
        {
          value: current,
          onValueChange: (next: string | null) => {
            if (next === null || next === ALL_VALUE) {
              props.onChange(undefined);
              return;
            }

            props.onChange({ eq: valuesByKey.get(next) ?? next });
          },
        },
        {
          default: () => [
            h(
              SelectTrigger,
              { class: "w-full", "aria-label": props.field.label ?? props.field.name },
              { default: () => h(SelectValue, { placeholder: "All" }) },
            ),
            h(SelectContent, {}, {
              default: () => [
                h(SelectItem, { value: ALL_VALUE }, { default: () => "All" }),
                ...options.map((option) =>
                  h(
                    SelectItem,
                    { key: String(option.value), value: String(option.value) },
                    { default: () => option.label },
                  ),
                ),
              ],
            }),
          ],
        },
      );
    };
  },
});

/** A number/date/datetime field's filter: an inclusive min/max range. */
const RangeFilterControl = defineComponent({
  name: "RangeFilterControl",
  props: filterControlProps(),
  setup(props) {
    return () => {
      const inputType =
        props.field.fieldType === "date"
          ? "date"
          : props.field.fieldType === "datetime"
            ? "datetime-local"
            : "number";

      function apply(min: string, max: string): void {
        const next: FieldFilter = {};
        if (min !== "") {
          const value =
            inputType === "number"
              ? Number(min)
              : inputType === "datetime-local"
                ? dateTimeFilterValue(min)
                : min;
          if (value !== undefined) next.gte = value;
        }
        if (max !== "") {
          const value =
            inputType === "number"
              ? Number(max)
              : inputType === "datetime-local"
                ? dateTimeFilterValue(max)
                : max;
          if (value !== undefined) next.lte = value;
        }
        // Native `min`/`max` attributes guide browser input, but callers can
        // still type or script an inverted range. Never let that reach an
        // adapter as an impossible (or misleading) query.
        if (!isOrderedRange(next.gte, next.lte)) return;

        props.onChange(Object.keys(next).length > 0 ? next : undefined);
      }

      const minValue =
        props.value?.gte === undefined
          ? ""
          : inputType === "datetime-local"
            ? dateTimeLocalInputValue(String(props.value.gte))
            : String(props.value.gte);
      const maxValue =
        props.value?.lte === undefined
          ? ""
          : inputType === "datetime-local"
            ? dateTimeLocalInputValue(String(props.value.lte))
            : String(props.value.lte);

      return h("div", { class: "flex items-center gap-1" }, [
        h(Input, {
          type: inputType,
          "aria-label": `${props.field.label ?? props.field.name} minimum`,
          placeholder: "Min",
          value: minValue,
          max: maxValue || undefined,
          onInput: (event: Event) =>
            apply((event.target as HTMLInputElement).value, maxValue),
        }),
        h("span", { class: "text-muted-foreground" }, "–"),
        h(Input, {
          type: inputType,
          "aria-label": `${props.field.label ?? props.field.name} maximum`,
          placeholder: "Max",
          value: maxValue,
          min: minValue || undefined,
          onInput: (event: Event) =>
            apply(minValue, (event.target as HTMLInputElement).value),
        }),
      ]);
    };
  },
});

/** A text-like field's filter: an exact match. */
const TextFilterControl = defineComponent({
  name: "TextFilterControl",
  props: filterControlProps(),
  setup(props) {
    return () =>
      h(Input, {
        type: "text",
        "aria-label": props.field.label ?? props.field.name,
        placeholder: "Exact match",
        value: props.value?.eq === undefined ? "" : String(props.value.eq),
        onInput: (event: Event) => {
          const next = (event.target as HTMLInputElement).value;
          props.onChange(next === "" ? undefined : { eq: next });
        },
      });
  },
});

function filterControl(
  field: FieldSchema,
  value: FieldFilter | undefined,
  onChange: (next: FieldFilter | undefined) => void,
): VNode {
  if (field.fieldType === "boolean") {
    return h(BooleanFilterControl, { field, value, onChange });
  }

  if (field.fieldType === "select") {
    return h(SelectFilterControl, { field, value, onChange });
  }

  if (
    field.fieldType === "number" ||
    field.fieldType === "date" ||
    field.fieldType === "datetime"
  ) {
    return h(RangeFilterControl, { field, value, onChange });
  }

  return h(TextFilterControl, { field, value, onChange });
}

/** Props for {@link ResourceTableFilterPanel}. */
export interface ResourceTableFilterPanelProps {
  /** Field schemas to render controls for — only entries with `filterable: true` produce a control. */
  fields: Record<string, FieldSchema>;
  /** The table's current active filters. */
  filters: ResourceTableFilters;
  /** Called with the full replacement filter set whenever a control changes. */
  onFiltersChange: (filters: ResourceTableFilters) => void;
}

/**
 * A grid of per-field filter controls — one per `filterable` field, typed to
 * that field's `fieldType` (boolean toggle, select dropdown, number/date
 * range, or exact-match text) — that read and write `ResourceTable`'s active
 * filters. Renders nothing if no field is `filterable`.
 */
export const ResourceTableFilterPanel = defineComponent({
  name: "ResourceTableFilterPanel",
  props: {
    fields: { type: Object as PropType<Record<string, FieldSchema>>, required: true },
    filters: { type: Object as PropType<ResourceTableFilters>, required: true },
    onFiltersChange: {
      type: Function as PropType<(filters: ResourceTableFilters) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const filterFields = filterableFields(props.fields);
      const hasActiveFilters = Object.keys(props.filters).length > 0;

      if (filterFields.length === 0) {
        return null;
      }

      function setFilter(name: string, next: FieldFilter | undefined): void {
        const nextFilters = { ...props.filters };

        if (!next) {
          delete nextFilters[name];
        } else {
          nextFilters[name] = next;
        }

        props.onFiltersChange(nextFilters);
      }

      return h(
        "div",
        {
          class:
            "grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2 md:grid-cols-3",
        },
        [
          hasActiveFilters
            ? h("div", { class: "flex justify-end sm:col-span-2 md:col-span-3" }, [
                h(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "xs",
                    onClick: () => props.onFiltersChange({}),
                  },
                  { default: () => "Clear filters" },
                ),
              ])
            : null,
          ...filterFields.map((field) =>
            h("div", { key: field.name, class: "grid gap-1" }, [
              h(Label, {}, { default: () => field.label ?? field.name }),
              filterControl(field, props.filters[field.name], (next) =>
                setFilter(field.name, next),
              ),
            ]),
          ),
        ],
      );
    };
  },
});
