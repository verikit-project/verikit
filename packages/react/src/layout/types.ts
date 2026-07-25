import type { RelationshipNode, SchemaNode } from "@verikit/core";
import type { ReactNode } from "react";
import type { VerikitFieldRegistry } from "../fields/index.js";
import type { SchemaPath } from "./path.js";

export interface SchemaRenderProps {
  values: Record<string, unknown>;
  path?: SchemaPath;
  errors?: Record<string, ReactNode>;
  disabled?: boolean;
  readOnly?: boolean;
  registry?: Partial<VerikitFieldRegistry>;
  activeTab?: number;
  onActiveTabChange?: (index: number) => void;
  activeStep?: number;
  onActiveStepChange?: (index: number) => void;
  onFieldChange?: (path: SchemaPath, value: unknown) => void;
  onFieldBlur?: (path: SchemaPath) => void;
  onAction?: (name: string, path: SchemaPath) => void;
  onRepeaterAdd?: (path: SchemaPath) => void;
  onRepeaterRemove?: (path: SchemaPath, index: number) => void;
  renderRelationship?: (node: RelationshipNode, path: SchemaPath) => ReactNode;
}

export interface RenderSchemaNodeProps extends SchemaRenderProps {
  node: SchemaNode;
  className?: string;
}

export interface RenderSchemaTreeProps extends SchemaRenderProps {
  nodes: readonly SchemaNode[];
}
