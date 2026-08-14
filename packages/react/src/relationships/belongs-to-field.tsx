import type { BelongsToRelationshipSchema } from "@verikit/core";
import type { ReactElement, ReactNode } from "react";
import { Label } from "#components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/select";
import { cn } from "#lib/utils";
import { useResourceRelationship } from "../query/use-resource-queries.js";

/** Props for {@link BelongsToRelationshipField}. */
export interface BelongsToRelationshipFieldProps {
  /** Finalized `belongsTo` relationship node being rendered. */
  relationship: BelongsToRelationshipSchema;
  /** Explicit input id. Defaults to a stable id derived from the relationship. */
  id?: string;
  /** Current foreign-key value (the selected record's id), if any. */
  value?: unknown;
  /** Error content shown below the select and linked with ARIA. */
  error?: ReactNode;
  /** Disables the select. */
  disabled?: boolean;
  /** Marks the select as read-only. */
  readOnly?: boolean;
  /** Class name applied to the outer wrapper. */
  className?: string;
  /** Called with the next foreign-key value (or `null` when cleared). */
  onValueChange?: (value: string | null) => void;
  /** Called when the select loses focus. */
  onBlur?: () => void;
}

function recordId(record: Record<string, unknown>): string {
  return String(record.id);
}

function recordLabel(
  record: Record<string, unknown>,
  displayField: string | undefined,
): string {
  const raw = displayField ? record[displayField] : undefined;

  return raw === null || raw === undefined ? recordId(record) : String(raw);
}

/**
 * Renders a `belongsTo` relationship as a permission-aware combobox,
 * reading and writing the related record's ID through its `.via()` field.
 */
export function BelongsToRelationshipField({
  relationship,
  id,
  value,
  error,
  disabled,
  readOnly,
  className,
  onValueChange,
  onBlur,
}: BelongsToRelationshipFieldProps): ReactElement {
  const relationshipName = relationship.name ?? "";
  const inputId =
    id ?? `verikit-relationship-${relationship.resource}-${relationshipName}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const { data, isLoading } = useResourceRelationship<Record<string, unknown>>(
    relationship.resource,
    relationshipName,
    {},
    { enabled: relationshipName.length > 0 },
  );
  const records = data?.records ?? [];
  const currentValue =
    value === null || value === undefined ? "" : String(value);

  return (
    <div className={cn("grid gap-2", className)}>
      {relationship.label ? (
        <Label htmlFor={inputId}>{relationship.label}</Label>
      ) : null}
      <Select
        name={relationshipName}
        value={currentValue}
        disabled={disabled === true}
        readOnly={readOnly === true}
        onValueChange={onValueChange}
      >
        <SelectTrigger
          id={inputId}
          className="w-full"
          onBlur={onBlur}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
        >
          <SelectValue placeholder={isLoading ? "Loading…" : "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {records.map((record) => (
            <SelectItem key={recordId(record)} value={recordId(record)}>
              {recordLabel(record, relationship.displayField)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
