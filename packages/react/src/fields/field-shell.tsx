import type { FieldSchema } from "@verikit/core";
import type { ReactNode } from "react";
import { Label } from "#components/label";
import { cn } from "#lib/utils";

export interface FieldShellProps {
  field: FieldSchema;
  id: string;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

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

export function fieldId(field: FieldSchema, id?: string): string {
  return id ?? `verikit-field-${field.name}`;
}
