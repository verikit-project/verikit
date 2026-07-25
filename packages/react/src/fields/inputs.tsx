import type { FieldSchema } from "@verikit/core";
import { Button } from "#components/button";
import { Checkbox } from "#components/checkbox";
import { Input } from "#components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/select";
import { Textarea } from "#components/textarea";
import { cn } from "#lib/utils";
import { FieldShell, fieldAriaProps, fieldId } from "./field-shell.js";
import type { VerikitFieldComponentProps } from "./types.js";

function textValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function dateValue(value: unknown, type: "date" | "datetime-local"): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return type === "date"
    ? date.toISOString().slice(0, 10)
    : date.toISOString().slice(0, 16);
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}

function fieldProperty(field: FieldSchema, key: string): unknown {
  return (field as FieldSchema & Record<string, unknown>)[key];
}

function inputConstraints(field: FieldSchema): {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  accept?: string;
  multiple?: boolean;
} {
  const minLength = fieldProperty(field, "minLength");
  const maxLength = fieldProperty(field, "maxLength");
  const min = fieldProperty(field, "min");
  const max = fieldProperty(field, "max");
  const step = fieldProperty(field, "step");
  const accept = fieldProperty(field, "accept");
  const multiple = fieldProperty(field, "multiple");

  return {
    minLength: typeof minLength === "number" ? minLength : undefined,
    maxLength: typeof maxLength === "number" ? maxLength : undefined,
    min: typeof min === "number" ? min : undefined,
    max: typeof max === "number" ? max : undefined,
    step: typeof step === "number" ? step : undefined,
    accept: stringList(accept)?.join(","),
    multiple: multiple === true ? true : undefined,
  };
}

function commonDisabled(field: FieldSchema, disabled?: boolean): boolean {
  return disabled === true || field.hidden === true;
}

function commonReadOnly(field: FieldSchema, readOnly?: boolean): boolean {
  return readOnly === true || field.readOnly === true;
}

/** Renders a text input field. */
export function TextField(props: VerikitFieldComponentProps) {
  return <InputField {...props} type="text" />;
}

/** Renders an email input field. */
export function EmailField(props: VerikitFieldComponentProps) {
  return <InputField {...props} type="email" />;
}

/** Renders a numeric input field. */
export function NumberField(props: VerikitFieldComponentProps) {
  return <InputField {...props} type="number" />;
}

/** Renders a date input field. */
export function DateField(props: VerikitFieldComponentProps) {
  return <InputField {...props} type="date" />;
}

/** Renders a date-time input field. */
export function DateTimeField(props: VerikitFieldComponentProps) {
  return <InputField {...props} type="datetime-local" />;
}

function InputField({
  field,
  id,
  name,
  value,
  error,
  disabled,
  readOnly,
  className,
  inputClassName,
  onBlur,
  onValueChange,
  type,
}: VerikitFieldComponentProps & {
  type: "text" | "email" | "number" | "date" | "datetime-local";
}) {
  const inputId = fieldId(field, id);
  const renderedValue =
    type === "date" || type === "datetime-local"
      ? dateValue(value, type)
      : textValue(value);

  return (
    <FieldShell field={field} id={inputId} error={error} className={className}>
      <Input
        id={inputId}
        name={name ?? field.name}
        type={type}
        value={renderedValue}
        placeholder={field.placeholder}
        required={field.required}
        disabled={commonDisabled(field, disabled)}
        readOnly={commonReadOnly(field, readOnly)}
        className={inputClassName}
        onBlur={onBlur}
        onChange={(event) => {
          const nextValue =
            type === "number"
              ? event.currentTarget.valueAsNumber
              : event.currentTarget.value;
          onValueChange?.(nextValue);
        }}
        {...fieldAriaProps(field, inputId, error)}
        {...inputConstraints(field)}
      />
    </FieldShell>
  );
}

/** Renders a textarea field. */
export function TextareaField({
  field,
  id,
  name,
  value,
  error,
  disabled,
  readOnly,
  className,
  inputClassName,
  onBlur,
  onValueChange,
}: VerikitFieldComponentProps) {
  const inputId = fieldId(field, id);

  return (
    <FieldShell field={field} id={inputId} error={error} className={className}>
      <Textarea
        id={inputId}
        name={name ?? field.name}
        value={textValue(value)}
        placeholder={field.placeholder}
        required={field.required}
        disabled={commonDisabled(field, disabled)}
        readOnly={commonReadOnly(field, readOnly)}
        className={inputClassName}
        onBlur={onBlur}
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
        {...fieldAriaProps(field, inputId, error)}
        {...inputConstraints(field)}
      />
    </FieldShell>
  );
}

/** Renders a select field from schema options. */
export function SelectField({
  field,
  id,
  name,
  value,
  error,
  disabled,
  className,
  inputClassName,
  onValueChange,
}: VerikitFieldComponentProps) {
  const inputId = fieldId(field, id);
  const options = field.options ?? [];
  const valuesByKey = new Map(
    options.map((option) => [String(option.value), option.value]),
  );

  return (
    <FieldShell field={field} id={inputId} error={error} className={className}>
      <Select
        name={name ?? field.name}
        value={textValue(value)}
        disabled={commonDisabled(field, disabled)}
        onValueChange={(nextValue: string | null) => {
          if (nextValue === null) {
            onValueChange?.(null);
            return;
          }

          onValueChange?.(valuesByKey.get(nextValue) ?? nextValue);
        }}
      >
        <SelectTrigger
          id={inputId}
          className={cn("w-full", inputClassName)}
          {...fieldAriaProps(field, inputId, error)}
        >
          <SelectValue placeholder={field.placeholder ?? "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

/** Renders a boolean field as a checkbox. */
export function BooleanField({
  field,
  id,
  name,
  value,
  error,
  disabled,
  readOnly,
  className,
  inputClassName,
  onValueChange,
}: VerikitFieldComponentProps) {
  const inputId = fieldId(field, id);
  const isDisabled =
    commonDisabled(field, disabled) || commonReadOnly(field, readOnly);

  return (
    <FieldShell field={field} id={inputId} error={error} className={className}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={inputId}
          name={name ?? field.name}
          checked={value === true}
          disabled={isDisabled}
          className={inputClassName}
          onCheckedChange={(nextValue: boolean) =>
            onValueChange?.(nextValue === true)
          }
          {...fieldAriaProps(field, inputId, error)}
        />
      </div>
    </FieldShell>
  );
}

/** Renders a file upload field. */
export function FileField(props: VerikitFieldComponentProps) {
  return <UploadField {...props} accept={undefined} />;
}

/** Renders an image upload field. */
export function ImageField(props: VerikitFieldComponentProps) {
  return <UploadField {...props} accept="image/*" />;
}

function UploadField({
  field,
  id,
  name,
  error,
  disabled,
  readOnly,
  className,
  inputClassName,
  onBlur,
  onValueChange,
  accept,
}: VerikitFieldComponentProps & {
  accept: string | undefined;
}) {
  const inputId = fieldId(field, id);
  const constraints = inputConstraints(field);

  return (
    <FieldShell field={field} id={inputId} error={error} className={className}>
      <div className="flex gap-2">
        <Input
          id={inputId}
          name={name ?? field.name}
          type="file"
          disabled={
            commonDisabled(field, disabled) || commonReadOnly(field, readOnly)
          }
          className={inputClassName}
          onBlur={onBlur}
          onChange={(event) => {
            const files = event.currentTarget.files;
            if (files) {
              onValueChange?.(files);
            }
          }}
          {...fieldAriaProps(field, inputId, error)}
          {...constraints}
          accept={constraints.accept ?? accept}
        />
        <Button
          type="button"
          variant="outline"
          disabled
          className="hidden shrink-0 sm:inline-flex"
        >
          Browse
        </Button>
      </div>
    </FieldShell>
  );
}
