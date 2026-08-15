import type { FieldSchema, FieldType } from "@verikit/core";
import { h, type VNode } from "vue";
import {
  BooleanField,
  DateField,
  DateTimeField,
  EmailField,
  FileField,
  ImageField,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from "./inputs.js";
import type {
  VerikitFieldComponent,
  VerikitFieldComponentProps,
  VerikitFieldRegistry,
} from "./types.js";

/** Default Reka UI-backed renderers for every built-in Verikit field type. */
export const defaultFieldRegistry = {
  text: TextField,
  textarea: TextareaField,
  email: EmailField,
  number: NumberField,
  select: SelectField,
  boolean: BooleanField,
  date: DateField,
  datetime: DateTimeField,
  file: FileField,
  image: ImageField,
} satisfies VerikitFieldRegistry;

/**
 * Resolves a field renderer from an override registry or the default registry.
 */
export function getFieldComponent(
  fieldType: FieldType,
  registry: Partial<VerikitFieldRegistry> = {},
): VerikitFieldComponent {
  return registry[fieldType] ?? defaultFieldRegistry[fieldType];
}

/** Props for rendering one Verikit field through a registry lookup. */
export interface RenderFieldProps extends VerikitFieldComponentProps {
  /** Schema metadata for the field being rendered. */
  field: FieldSchema;
  /** Optional renderer overrides keyed by field type. */
  registry?: Partial<VerikitFieldRegistry>;
}

/**
 * Renders a Verikit field with the matching component from the active registry. Renders nothing when the field is `hidden` or `formHidden` `resolveResourceSchema` sets `hidden` both for schema-authored hidden fields and for fields the actor lacks read access to, so a merely-`disabled` input would leak the label and current value of a field the actor isn't allowed to see. This is always a form-rendering context (schema trees back forms, not tables), so `formHidden` is checked here too, alongside the fully-hidden case.
 */
export function RenderField({
  registry,
  ...props
}: RenderFieldProps): VNode | null {
  if (props.field.hidden || props.field.formHidden) {
    return null;
  }

  const Component = getFieldComponent(props.field.fieldType, registry);

  return h(Component, props);
}
