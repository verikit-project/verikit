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

export function getFieldComponent(
  fieldType: FieldType,
  registry: Partial<VerikitFieldRegistry> = {},
): VerikitFieldComponent {
  return registry[fieldType] ?? defaultFieldRegistry[fieldType];
}

export interface RenderFieldProps extends VerikitFieldComponentProps {
  field: FieldSchema;
  registry?: Partial<VerikitFieldRegistry>;
}

export function RenderField({
  registry,
  ...props
}: RenderFieldProps): ReactElement {
  const Component = getFieldComponent(props.field.fieldType, registry);

  return <Component {...props} />;
}
