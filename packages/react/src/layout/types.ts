import type { RelationshipNode, SchemaNode } from "@verikit/core";
import type { ActionSchema } from "@verikit/runtime";
import type { ReactNode } from "react";
import type { VerikitFieldRegistry } from "../fields/index.js";
import type { SchemaPath } from "./path.js";

/** Runtime action builder or serialized action schema used by schema renderers. */
export type SchemaActionSource =
  | ActionSchema
  | {
      readonly name: string;
      toSchema(): ActionSchema;
    };

/** Runtime actions keyed by action node name. */
export type SchemaActionRegistry = Partial<Record<string, SchemaActionSource>>;

/** Shared props used while rendering Verikit schema nodes. */
export interface SchemaRenderProps {
  /** Current form values. */
  values: Record<string, unknown>;
  /** Path prefix for nested schema nodes. */
  path?: SchemaPath;
  /** Error content keyed by schema path. */
  errors?: Record<string, ReactNode>;
  /** Disables all rendered fields when supported. */
  disabled?: boolean;
  /** Marks all rendered fields as read-only when supported. */
  readOnly?: boolean;
  /** Optional field renderer overrides. */
  registry?: Partial<VerikitFieldRegistry>;
  /** Runtime actions whose forms should render for matching action nodes. */
  actions?: SchemaActionRegistry;
  /** Active tab index for tab nodes. */
  activeTab?: number;
  /** Called when a tab node changes active tab. */
  onActiveTabChange?: (index: number) => void;
  /** Active step index for wizard nodes. */
  activeStep?: number;
  /** Called when a wizard node changes active step. */
  onActiveStepChange?: (index: number) => void;
  /** Called when a field value changes. */
  onFieldChange?: (path: SchemaPath, value: unknown) => void;
  /** Called when a field loses focus. */
  onFieldBlur?: (path: SchemaPath) => void;
  /** Called when an action node is triggered. */
  onAction?: (name: string, path: SchemaPath) => void;
  /** Called when a repeater should append an item. */
  onRepeaterAdd?: (path: SchemaPath) => void;
  /** Called when a repeater should remove an item. */
  onRepeaterRemove?: (path: SchemaPath, index: number) => void;
  /** Custom renderer for relationship nodes. */
  renderRelationship?: (node: RelationshipNode, path: SchemaPath) => ReactNode;
}

/** Props for rendering a single schema node. */
export interface RenderSchemaNodeProps extends SchemaRenderProps {
  /** Schema node to render. */
  node: SchemaNode;
  /** Class name applied to the node wrapper when supported. */
  className?: string;
}

/** Props for rendering a list of schema nodes. */
export interface RenderSchemaTreeProps extends SchemaRenderProps {
  /** Schema nodes to render in order. */
  nodes: readonly SchemaNode[];
}
