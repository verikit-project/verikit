import type { FieldSchema } from "@verikit/core";
import type { ReactNode } from "react";
import { Label } from "#components/label";
import { cn } from "#lib/utils";

/** Props for the shared field wrapper used by Verikit inputs. */
export interface FieldShellProps {
  /** Schema metadata for the rendered field. */
  field: FieldSchema;
  /** Id assigned to the concrete input control. */
  id: string;
  /** Error content rendered below the input. */
  error?: ReactNode;
  /** Class name applied to the shell container. */
  className?: string;
  /** Input control rendered inside the shell. */
  children: ReactNode;
}

/**
 * Renders a label, description, error message, and field control wrapper.
 */
export function FieldShell({
  field,
  id,
  error,
  className,
  children,
}: FieldShellProps) {
  const descriptionId = field.description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      {field.label ? (
        <Label htmlFor={id} className="gap-1">
          {field.label}
          {field.required ? (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
      ) : null}
      {children}
      {field.description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {field.description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Builds ARIA props that connect a field with its description and error. */
export function fieldAriaProps(
  field: FieldSchema,
  id: string,
  error?: ReactNode,
): {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
} {
  const describedBy = [
    field.description ? `${id}-description` : undefined,
    error ? `${id}-error` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": field.required ? true : undefined,
  };
}

/** Returns the explicit id or derives a stable id from the field name. */
export function fieldId(field: FieldSchema, id?: string): string {
  return id ?? `verikit-field-${field.name}`;
}
