import type { FieldSchema, FieldType } from "@verikit/core";
import type { ReactElement } from "react";
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

/** Default shadcn-backed renderers for every built-in Verikit field type. */
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

/** Resolves a field renderer from an override registry or the default registry. */
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

/** Renders a Verikit field with the matching component from the active registry. */
export function RenderField({
  registry,
  ...props
}: RenderFieldProps): ReactElement {
  const Component = getFieldComponent(props.field.fieldType, registry);

  return <Component {...props} />;
}
