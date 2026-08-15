import type { FieldSchema } from "@verikit/core";
import { defineComponent, h, type PropType } from "vue";
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

function inputElement(event: Event): HTMLInputElement {
  return event.target as HTMLInputElement;
}

function fieldProps() {
  return {
    field: { type: Object as PropType<FieldSchema>, required: true as const },
    id: { type: String as PropType<string | undefined>, default: undefined },
    name: { type: String as PropType<string | undefined>, default: undefined },
    value: { type: null as unknown as PropType<unknown>, required: false },
    error: { type: null as unknown as PropType<unknown>, required: false },
    disabled: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    readOnly: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    className: { type: String as PropType<string | undefined>, default: undefined },
    inputClassName: { type: String as PropType<string | undefined>, default: undefined },
    onBlur: { type: Function as PropType<(() => void) | undefined>, default: undefined },
    onValueChange: {
      type: Function as PropType<((value: unknown) => void) | undefined>,
      default: undefined,
    },
  };
}

function makeInputField(type: "text" | "email" | "number" | "date" | "datetime-local") {
  return defineComponent({
    props: fieldProps(),
    setup(props: VerikitFieldComponentProps) {
      return () => {
        const inputId = fieldId(props.field, props.id);
        const renderedValue =
          type === "date" || type === "datetime-local"
            ? dateValue(props.value, type)
            : textValue(props.value);

        return h(
          FieldShell,
          { field: props.field, id: inputId, error: props.error, className: props.className },
          {
            default: () =>
              h(Input, {
                id: inputId,
                name: props.name ?? props.field.name,
                type,
                value: renderedValue,
                placeholder: props.field.placeholder,
                required: props.field.required,
                disabled: commonDisabled(props.field, props.disabled),
                readonly: commonReadOnly(props.field, props.readOnly),
                class: props.inputClassName,
                onBlur: props.onBlur,
                onInput: (event: Event) => {
                  const target = inputElement(event);
                  const nextValue = type === "number" ? target.valueAsNumber : target.value;
                  props.onValueChange?.(nextValue);
                },
                ...fieldAriaProps(props.field, inputId, props.error),
                ...inputConstraints(props.field),
              }),
          },
        );
      };
    },
  });
}

/** Renders a text input field. */
export const TextField = makeInputField("text");
/** Renders an email input field. */
export const EmailField = makeInputField("email");
/** Renders a numeric input field. */
export const NumberField = makeInputField("number");
/** Renders a date input field. */
export const DateField = makeInputField("date");
/** Renders a date-time input field. */
export const DateTimeField = makeInputField("datetime-local");

/** Renders a textarea field. */
export const TextareaField = defineComponent({
  name: "TextareaField",
  props: fieldProps(),
  setup(props: VerikitFieldComponentProps) {
    return () => {
      const inputId = fieldId(props.field, props.id);

      return h(
        FieldShell,
        { field: props.field, id: inputId, error: props.error, className: props.className },
        {
          default: () =>
            h(Textarea, {
              id: inputId,
              name: props.name ?? props.field.name,
              value: textValue(props.value),
              placeholder: props.field.placeholder,
              required: props.field.required,
              disabled: commonDisabled(props.field, props.disabled),
              readonly: commonReadOnly(props.field, props.readOnly),
              class: props.inputClassName,
              onBlur: props.onBlur,
              onInput: (event: Event) => props.onValueChange?.(inputElement(event).value),
              ...fieldAriaProps(props.field, inputId, props.error),
              ...inputConstraints(props.field),
            }),
        },
      );
    };
  },
});

/** Renders a select field from schema options. */
export const SelectField = defineComponent({
  name: "SelectField",
  props: fieldProps(),
  setup(props: VerikitFieldComponentProps) {
    return () => {
      const inputId = fieldId(props.field, props.id);
      const options = props.field.options ?? [];
      const valuesByKey = new Map(
        options.map((option) => [String(option.value), option.value]),
      );

      return h(
        FieldShell,
        { field: props.field, id: inputId, error: props.error, className: props.className },
        {
          default: () =>
            h(
              Select,
              {
                name: props.name ?? props.field.name,
                value: textValue(props.value),
                disabled: commonDisabled(props.field, props.disabled),
                onValueChange: (nextValue: string | null) => {
                  if (nextValue === null) {
                    props.onValueChange?.(null);
                    return;
                  }

                  props.onValueChange?.(valuesByKey.get(nextValue) ?? nextValue);
                },
              },
              {
                default: () => [
                  h(
                    SelectTrigger,
                    {
                      id: inputId,
                      class: cn("w-full", props.inputClassName),
                      onBlur: props.onBlur,
                      ...fieldAriaProps(props.field, inputId, props.error),
                    },
                    { default: () => h(SelectValue, { placeholder: props.field.placeholder ?? "Select..." }) },
                  ),
                  h(SelectContent, {}, {
                    default: () =>
                      options.map((option) =>
                        h(
                          SelectItem,
                          { key: String(option.value), value: String(option.value) },
                          { default: () => option.label },
                        ),
                      ),
                  }),
                ],
              },
            ),
        },
      );
    };
  },
});

/** Renders a boolean field as a checkbox. */
export const BooleanField = defineComponent({
  name: "BooleanField",
  props: fieldProps(),
  setup(props: VerikitFieldComponentProps) {
    return () => {
      const inputId = fieldId(props.field, props.id);
      const isDisabled =
        commonDisabled(props.field, props.disabled) ||
        commonReadOnly(props.field, props.readOnly);

      return h(
        FieldShell,
        { field: props.field, id: inputId, error: props.error, className: props.className },
        {
          default: () =>
            h("div", { class: "flex items-center gap-2" }, [
              h(Checkbox, {
                id: inputId,
                name: props.name ?? props.field.name,
                checked: props.value === true,
                disabled: isDisabled,
                class: props.inputClassName,
                onCheckedChange: (nextValue: boolean) => props.onValueChange?.(nextValue === true),
                ...fieldAriaProps(props.field, inputId, props.error),
              }),
            ]),
        },
      );
    };
  },
});

function makeUploadField(accept: string | undefined) {
  return defineComponent({
    props: fieldProps(),
    setup(props: VerikitFieldComponentProps) {
      return () => {
        const inputId = fieldId(props.field, props.id);
        const constraints = inputConstraints(props.field);

        return h(
          FieldShell,
          { field: props.field, id: inputId, error: props.error, className: props.className },
          {
            default: () =>
              h("div", { class: "flex gap-2" }, [
                h(Input, {
                  id: inputId,
                  name: props.name ?? props.field.name,
                  type: "file",
                  disabled:
                    commonDisabled(props.field, props.disabled) ||
                    commonReadOnly(props.field, props.readOnly),
                  class: props.inputClassName,
                  onBlur: props.onBlur,
                  onChange: (event: Event) => {
                    const files = inputElement(event).files;
                    if (files) {
                      props.onValueChange?.(files);
                    }
                  },
                  ...fieldAriaProps(props.field, inputId, props.error),
                  ...constraints,
                  accept: constraints.accept ?? accept,
                }),
                h(
                  Button,
                  { type: "button", variant: "outline", disabled: true, class: "hidden shrink-0 sm:inline-flex" },
                  { default: () => "Browse" },
                ),
              ]),
          },
        );
      };
    },
  });
}

/** Renders a file upload field. */
export const FileField = makeUploadField(undefined);
/** Renders an image upload field. */
export const ImageField = makeUploadField("image/*");
