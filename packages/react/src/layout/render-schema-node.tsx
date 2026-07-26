import type {
  ActionNode,
  FieldNode,
  GridNode,
  RepeaterNode,
  SchemaNode,
  SectionNode,
  TabsNode,
  WizardNode,
} from "@verikit/core";
import type { ActionSchema } from "@verikit/runtime";
import type { ReactElement, ReactNode } from "react";
import { Button } from "#components/button";
import { cn } from "#lib/utils";
import { RenderField } from "../fields/index.js";
import { getValueAtPath, pathKey, type SchemaPath } from "./path.js";
import type { RenderSchemaNodeProps, RenderSchemaTreeProps } from "./types.js";

function actionSchemaFor(
  node: ActionNode,
  props: RenderSchemaNodeProps,
): ActionSchema | undefined {
  const source = props.actions?.[node.name];

  if (!source) {
    return undefined;
  }

  return "toSchema" in source ? source.toSchema() : source;
}

function actionInputNodes(
  node: ActionNode,
  props: RenderSchemaNodeProps,
): SchemaNode[] | undefined {
  const actionSchema = actionSchemaFor(node, props);

  if (actionSchema?.form) {
    return Object.entries(actionSchema.form).map(
      ([name, field]): FieldNode => ({
        ...field,
        type: "field",
        name,
      }),
    );
  }

  return node.input;
}

function schemaNodeKey(node: SchemaNode, index: number): string {
  return "name" in node && typeof node.name === "string"
    ? `${node.type}:${node.name}`
    : `${node.type}:${index}`;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), length - 1);
}

function schemaRenderProps(
  props: RenderSchemaNodeProps,
): Omit<RenderSchemaNodeProps, "node" | "className"> {
  const { node: _node, className: _className, ...rest } = props;

  return rest;
}

function renderFieldNode(
  node: FieldNode,
  props: RenderSchemaNodeProps,
  path: SchemaPath,
): ReactElement {
  const fieldPath = [...path, node.name];

  return (
    <RenderField
      field={node}
      registry={props.registry}
      className={props.className}
      value={getValueAtPath(props.values, fieldPath)}
      error={props.errors?.[pathKey(fieldPath)]}
      disabled={props.disabled}
      readOnly={props.readOnly}
      onValueChange={(value) => props.onFieldChange?.(fieldPath, value)}
      onBlur={() => props.onFieldBlur?.(fieldPath)}
    />
  );
}

function renderSectionNode(
  node: SectionNode,
  props: RenderSchemaNodeProps,
  path: SchemaPath,
): ReactElement {
  return (
    <section className={cn("grid gap-4", props.className)}>
      <h3 className="text-sm font-medium text-foreground">{node.title}</h3>
      <RenderSchemaTree
        {...schemaRenderProps(props)}
        nodes={node.children}
        path={path}
      />
    </section>
  );
}

function renderGridNode(
  node: GridNode,
  props: RenderSchemaNodeProps,
  path: SchemaPath,
): ReactElement {
  return (
    <div
      className={cn("grid gap-4", props.className)}
      style={{ gridTemplateColumns: `repeat(${node.columns}, minmax(0, 1fr))` }}
    >
      <RenderSchemaTree
        {...schemaRenderProps(props)}
        nodes={node.children}
        path={path}
      />
    </div>
  );
}

function renderTabsNode(
  node: TabsNode,
  props: RenderSchemaNodeProps,
  path: SchemaPath,
): ReactElement {
  const activeTab = clampIndex(props.activeTab ?? 0, node.tabs.length);
  const activeTabEntry = node.tabs[activeTab];

  return (
    <div className={cn("grid gap-4", props.className)}>
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {node.tabs.map((tab, index) => (
          <Button
            key={tab.title}
            type="button"
            role="tab"
            aria-selected={index === activeTab}
            variant={index === activeTab ? "secondary" : "ghost"}
            size="sm"
            onClick={() => props.onActiveTabChange?.(index)}
          >
            {tab.title}
          </Button>
        ))}
      </div>
      {activeTabEntry ? (
        <div role="tabpanel">
          <RenderSchemaTree
            {...schemaRenderProps(props)}
            nodes={activeTabEntry.children}
            path={path}
          />
        </div>
      ) : null}
    </div>
  );
}

function renderWizardNode(
  node: WizardNode,
  props: RenderSchemaNodeProps,
  path: SchemaPath,
): ReactElement {
  const stepCount = node.steps.length;
  const activeStep = clampIndex(props.activeStep ?? 0, stepCount);
  const activeStepEntry = node.steps[activeStep];

  return (
    <div className={cn("grid gap-4", props.className)}>
      <ol className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {node.steps.map((step, index) => (
          <li
            key={step.title}
            aria-current={index === activeStep ? "step" : undefined}
            className={cn(
              index === activeStep && "font-medium text-foreground",
            )}
          >
            {step.title}
          </li>
        ))}
      </ol>
      {activeStepEntry ? (
        <RenderSchemaTree
          {...schemaRenderProps(props)}
          nodes={activeStepEntry.children}
          path={path}
        />
      ) : null}
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={activeStep <= 0}
          onClick={() => props.onActiveStepChange?.(activeStep - 1)}
        >
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={activeStep >= stepCount - 1}
          onClick={() => props.onActiveStepChange?.(activeStep + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function renderRepeaterNode(
  node: RepeaterNode,
  props: RenderSchemaNodeProps,
  path: SchemaPath,
): ReactElement {
  const repeaterPath = [...path, node.name];
  const items = getValueAtPath(props.values, repeaterPath);
  const rows = Array.isArray(items) ? items : [];

  return (
    <div className={cn("grid gap-4", props.className)}>
      {rows.map((_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-lg border border-border p-3"
        >
          <RenderSchemaTree
            {...schemaRenderProps(props)}
            nodes={node.children}
            path={[...repeaterPath, index]}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => props.onRepeaterRemove?.(repeaterPath, index)}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() => props.onRepeaterAdd?.(repeaterPath)}
      >
        Add
      </Button>
    </div>
  );
}

function renderActionNode(
  node: ActionNode,
  props: RenderSchemaNodeProps,
  path: SchemaPath,
): ReactElement {
  const actionPath = [...path, node.name];
  const actionSchema = actionSchemaFor(node, props);
  const input = actionInputNodes(node, props);

  return (
    <div className={cn("grid gap-4", props.className)}>
      {input ? (
        <RenderSchemaTree
          {...schemaRenderProps(props)}
          nodes={input}
          path={actionPath}
        />
      ) : null}
      <Button
        type="button"
        className="justify-self-start"
        onClick={() => props.onAction?.(node.name, actionPath)}
      >
        {node.label ?? actionSchema?.label ?? node.name}
      </Button>
    </div>
  );
}

/** Renders one Verikit schema node using the built-in React layout components. */
export function RenderSchemaNode(props: RenderSchemaNodeProps): ReactNode {
  const { node } = props;
  const path = props.path ?? [];

  switch (node.type) {
    case "field":
      return renderFieldNode(node, props, path);
    case "relationship":
      return props.renderRelationship?.(node, path) ?? null;
    case "section":
      return renderSectionNode(node, props, path);
    case "grid":
      return renderGridNode(node, props, path);
    case "tabs":
      return renderTabsNode(node, props, path);
    case "wizard":
      return renderWizardNode(node, props, path);
    case "repeater":
      return renderRepeaterNode(node, props, path);
    case "action":
      return renderActionNode(node, props, path);
  }
}

/** Renders a list of Verikit schema nodes. */
export function RenderSchemaTree({
  nodes,
  ...rest
}: RenderSchemaTreeProps): ReactElement {
  return (
    <>
      {nodes.map((node, index) => (
        <RenderSchemaNode
          key={schemaNodeKey(node, index)}
          node={node}
          {...rest}
        />
      ))}
    </>
  );
}
