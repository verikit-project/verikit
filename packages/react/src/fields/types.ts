import type { FieldSchema, FieldType } from "@verikit/core";
import type { ComponentType, ReactNode } from "react";

/** Props passed to every Verikit field component. */
export interface VerikitFieldComponentProps<TValue = unknown> {
  /** Schema metadata for the field being rendered. */
  field: FieldSchema;
  /** Explicit input id. Defaults to a stable id derived from the field name. */
  id?: string;
  /** HTML form field name. Defaults to the schema field name. */
  name?: string;
  /** Current field value. */
  value?: TValue;
  /** Error content shown below the field and linked with ARIA. */
  error?: ReactNode;
  /** Disables user input for the field. */
  disabled?: boolean;
  /** Marks the field as read-only when supported by the input. */
  readOnly?: boolean;
  /** Class name applied to the outer field shell. */
  className?: string;
  /** Class name applied to the concrete input control. */
  inputClassName?: string;
  /** Called when the rendered input loses focus. */
  onBlur?: () => void;
  /** Called with the next field value when user input changes. */
  onValueChange?: (value: TValue) => void;
}

/** React component capable of rendering a Verikit field schema. */
export type VerikitFieldComponent = ComponentType<VerikitFieldComponentProps>;

/** Mapping from Verikit field types to their React renderers. */
export type VerikitFieldRegistry = {
  [TType in FieldType]: VerikitFieldComponent;
};
