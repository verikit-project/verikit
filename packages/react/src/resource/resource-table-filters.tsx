import type { ReactElement } from "react";
import type { FieldSchema } from "@verikit/core";
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

/** A boolean field's tri-state filter: unset, true, or false. */
function BooleanFilterControl({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: FieldFilter | undefined;
  onChange: (next: FieldFilter | undefined) => void;
}): ReactElement {
  const current =
    value?.eq === true ? "true" : value?.eq === false ? "false" : ALL_VALUE;

  return (
    <Select
      value={current}
      onValueChange={(next: string | null) => {
        if (next === "true") {
          onChange({ eq: true });
        } else if (next === "false") {
          onChange({ eq: false });
        } else {
          onChange(undefined);
        }
      }}
    >
      <SelectTrigger className="w-full" aria-label={field.label ?? field.name}>
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        <SelectItem value="true">Yes</SelectItem>
        <SelectItem value="false">No</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** A select field's filter: unset, or exact match against one of its options. */
function SelectFilterControl({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: FieldFilter | undefined;
  onChange: (next: FieldFilter | undefined) => void;
}): ReactElement {
  const options = field.options ?? [];
  const valuesByKey = new Map(
    options.map((option) => [String(option.value), option.value]),
  );
  const current = value?.eq === undefined ? ALL_VALUE : String(value.eq);

  return (
    <Select
      value={current}
      onValueChange={(next: string | null) => {
        if (next === null || next === ALL_VALUE) {
          onChange(undefined);
          return;
        }

        onChange({ eq: valuesByKey.get(next) ?? next });
      }}
    >
      <SelectTrigger className="w-full" aria-label={field.label ?? field.name}>
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A number/date/datetime field's filter: an inclusive min/max range. */
function RangeFilterControl({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: FieldFilter | undefined;
  onChange: (next: FieldFilter | undefined) => void;
}): ReactElement {
  const inputType =
    field.fieldType === "date"
      ? "date"
      : field.fieldType === "datetime"
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
    // still type or script an inverted range. Never let that reach an adapter
    // as an impossible (or misleading) query.
    if (!isOrderedRange(next.gte, next.lte)) return;

    onChange(Object.keys(next).length > 0 ? next : undefined);
  }

  const minValue =
    value?.gte === undefined
      ? ""
      : inputType === "datetime-local"
        ? dateTimeLocalInputValue(String(value.gte))
        : String(value.gte);
  const maxValue =
    value?.lte === undefined
      ? ""
      : inputType === "datetime-local"
        ? dateTimeLocalInputValue(String(value.lte))
        : String(value.lte);

  return (
    <div className="flex items-center gap-1">
      <Input
        type={inputType}
        aria-label={`${field.label ?? field.name} minimum`}
        placeholder="Min"
        value={minValue}
        max={maxValue || undefined}
        onChange={(event) => apply(event.currentTarget.value, maxValue)}
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type={inputType}
        aria-label={`${field.label ?? field.name} maximum`}
        placeholder="Max"
        value={maxValue}
        min={minValue || undefined}
        onChange={(event) => apply(minValue, event.currentTarget.value)}
      />
    </div>
  );
}

/** A text-like field's filter: an exact match. */
function TextFilterControl({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: FieldFilter | undefined;
  onChange: (next: FieldFilter | undefined) => void;
}): ReactElement {
  return (
    <Input
      type="text"
      aria-label={field.label ?? field.name}
      placeholder="Exact match"
      value={value?.eq === undefined ? "" : String(value.eq)}
      onChange={(event) => {
        const next = event.currentTarget.value;
        onChange(next === "" ? undefined : { eq: next });
      }}
    />
  );
}

function FilterControl({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: FieldFilter | undefined;
  onChange: (next: FieldFilter | undefined) => void;
}): ReactElement {
  if (field.fieldType === "boolean") {
    return (
      <BooleanFilterControl field={field} value={value} onChange={onChange} />
    );
  }

  if (field.fieldType === "select") {
    return (
      <SelectFilterControl field={field} value={value} onChange={onChange} />
    );
  }

  if (
    field.fieldType === "number" ||
    field.fieldType === "date" ||
    field.fieldType === "datetime"
  ) {
    return (
      <RangeFilterControl field={field} value={value} onChange={onChange} />
    );
  }

  return <TextFilterControl field={field} value={value} onChange={onChange} />;
}

/** Props for {@link ResourceTableFilterPanel}. */
export interface ResourceTableFilterPanelProps {
  /** Field schemas to render controls for  only entries with `filterable: true` produce a control. */
  fields: Record<string, FieldSchema>;
  /** The table's current active filters. */
  filters: ResourceTableFilters;
  /** Called with the full replacement filter set whenever a control changes. */
  onFiltersChange: (filters: ResourceTableFilters) => void;
}

/**
 * A grid of per-field filter controls  one per `filterable` field, typed to
 * that field's `fieldType` (boolean toggle, select dropdown, number/date
 * range, or exact-match text)  that read and write `ResourceTable`'s active
 * filters. Renders nothing if no field is `filterable`.
 */
export function ResourceTableFilterPanel({
  fields,
  filters,
  onFiltersChange,
}: ResourceTableFilterPanelProps): ReactElement | null {
  const filterFields = filterableFields(fields);
  const hasActiveFilters = Object.keys(filters).length > 0;

  if (filterFields.length === 0) {
    return null;
  }

  function setFilter(name: string, next: FieldFilter | undefined): void {
    const nextFilters = { ...filters };

    if (!next) {
      delete nextFilters[name];
    } else {
      nextFilters[name] = next;
    }

    onFiltersChange(nextFilters);
  }

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2 md:grid-cols-3">
      {hasActiveFilters ? (
        <div className="flex justify-end sm:col-span-2 md:col-span-3">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onFiltersChange({})}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
      {filterFields.map((field) => (
        <div key={field.name} className="grid gap-1">
          <Label>{field.label ?? field.name}</Label>
          <FilterControl
            field={field}
            value={filters[field.name]}
            onChange={(next) => setFilter(field.name, next)}
          />
        </div>
      ))}
    </div>
  );
}
