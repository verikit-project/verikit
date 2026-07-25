import type { FieldSchema, FieldType } from "@verikit/core";
import type { ComponentType, ReactNode } from "react";

export interface VerikitFieldComponentProps<TValue = unknown> {
  field: FieldSchema;
  id?: string;
  name?: string;
  value?: TValue;
  error?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
  onBlur?: () => void;
  onValueChange?: (value: TValue) => void;
}

export type VerikitFieldComponent = ComponentType<VerikitFieldComponentProps>;

export type VerikitFieldRegistry = {
  [TType in FieldType]: VerikitFieldComponent;
};
