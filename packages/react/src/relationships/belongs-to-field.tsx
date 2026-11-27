import type { BelongsToRelationshipSchema } from "@verikit/core";
import { useState, type ReactElement, type ReactNode } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#components/combobox";
import { Label } from "#components/label";
import { cn } from "#lib/utils";
import { useRelationshipPicker } from "./use-relationship-picker.js";

/** Props for {@link BelongsToRelationshipField}. */
export interface BelongsToRelationshipFieldProps {
  /** Finalized `belongsTo` relationship node being rendered. */
  relationship: BelongsToRelationshipSchema;
  /**
   * Name of the resource that owns the relationship (the one being edited).
   * Options come from its `/relationships/:name` route. Defaults to the
   * target resource, which only matches for a self-referencing relationship.
   */
  resourceName?: string;
  /** Explicit input id. Defaults to a stable id derived from the relationship. */
  id?: string;
  /** Current foreign-key value (the selected record's id), if any. */
  value?: unknown;
  /** Error content shown below the picker and linked with ARIA. */
  error?: ReactNode;
  /** Disables the picker. */
  disabled?: boolean;
  /** Marks the picker as read-only. */
  readOnly?: boolean;
  /** Class name applied to the outer wrapper. */
  className?: string;
  /** Called with the next foreign-key value (or `null` when cleared). */
  onValueChange?: (value: string | null) => void;
  /** Called when the picker's input loses focus. */
  onBlur?: () => void;
}

/**
 * Renders a `belongsTo` relationship as a permission-aware, searchable
 * combobox, reading and writing the related record's ID through its `.via()`
 * field. Typing searches the server (the target's `displayField` and
 * `.searchable()` fields), options load 25 at a time with "Load more", and the
 * selected record's label is shown even when it isn't among the loaded
 * options.
 */
export function BelongsToRelationshipField({
  relationship,
  resourceName,
  id,
  value,
  error,
  disabled,
  readOnly,
  className,
  onValueChange,
  onBlur,
}: BelongsToRelationshipFieldProps): ReactElement {
  const inputId =
    id ??
    `verikit-relationship-${relationship.resource}-${relationship.name ?? ""}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const currentValue =
    value === null || value === undefined ? "" : String(value);
  // While the popup is open the input holds what's typed (the selected
  // record's label stays visible as the placeholder); closed, it shows that
  // label.
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const picker = useRelationshipPicker({
    resourceName: resourceName ?? relationship.resource,
    relationship,
    value: currentValue,
    search,
  });
  const selectedLabel = currentValue ? picker.labelFor(currentValue) : "";
  const editable = disabled !== true && readOnly !== true;

  return (
    <div className={cn("grid gap-2", className)}>
      {relationship.label ? (
        <Label htmlFor={inputId}>{relationship.label}</Label>
      ) : null}
      <Combobox<string>
        items={picker.ids}
        // Options are already searched on the server.
        filter={null}
        value={currentValue === "" ? null : currentValue}
        itemToStringLabel={picker.labelFor}
        inputValue={open ? search : selectedLabel}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
        onInputValueChange={(text, details) => {
          if (details.reason === "input-change") {
            setSearch(text);
          }
        }}
        onValueChange={(next) => onValueChange?.(next)}
        name={relationship.name}
        disabled={disabled === true}
        readOnly={readOnly === true}
      >
        <ComboboxInput
          id={inputId}
          placeholder={
            picker.isLoading ? "Loading…" : selectedLabel || "Search…"
          }
          showClear={editable && currentValue !== ""}
          onBlur={onBlur}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
        />
        <ComboboxContent>
          <ComboboxEmpty>
            {picker.isLoading ? "Loading…" : "No matches."}
          </ComboboxEmpty>
          <ComboboxList>
            {(optionId: string) => (
              <ComboboxItem key={optionId} value={optionId}>
                {picker.labelFor(optionId)}
              </ComboboxItem>
            )}
          </ComboboxList>
          {picker.hasMore ? (
            <button
              type="button"
              className="w-full rounded-md px-1.5 py-1 text-left text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
              disabled={picker.isLoadingMore}
              onClick={picker.loadMore}
            >
              {picker.isLoadingMore ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </ComboboxContent>
      </Combobox>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {picker.error ? (
        <p role="alert" className="text-sm text-destructive">
          {picker.error.message}
        </p>
      ) : null}
    </div>
  );
}
