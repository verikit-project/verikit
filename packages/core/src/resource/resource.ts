import { AnyFieldBuilder, FieldSchema, InferField } from "../fields/base.js";

export type FieldMap = Record<string, AnyFieldBuilder>;

export interface FieldNode extends FieldSchema {
  type: "field";
}

export interface SectionNode {
  type: "section";
  title: string;
  children: SchemaNode[];
}

export interface GridNode {
  type: "grid";
  columns: number;
  children: SchemaNode[];
}

export interface TabsNode {
  type: "tabs";
  tabs: readonly {
    title: string;
    children: SchemaNode[];
  }[];
}

export interface WizardNode {
  type: "wizard";
  steps: readonly {
    title: string;
    children: SchemaNode[];
  }[];
}

export interface RepeaterNode {
  type: "repeater";
  name: string;
  children: SchemaNode[];
}

export interface ActionNode {
  type: "action";
  name: string;
  label?: string;
  input?: SchemaNode[];
}

export type SchemaNode =
  | FieldNode
  | SectionNode
  | GridNode
  | TabsNode
  | WizardNode
  | RepeaterNode
  | ActionNode;

export interface ResourceSchema<
  TName extends string = string,
  TFields extends FieldMap = FieldMap,
> {
  type: "resource";
  name: TName;
  fields: {
    [K in keyof TFields & string]: ReturnType<TFields[K]["toSchema"]>;
  };
  tree: SchemaNode[];
  meta?: Record<string, unknown>;
}

export interface ResourceConfig<
  TFields extends FieldMap = FieldMap,
  TTable = unknown,
> {
  table?: TTable;
  fields: TFields;
  meta?: Record<string, unknown>;
}

export type InferResource<TResource> =
  TResource extends Resource<string, infer TFields, unknown>
    ? {
        [K in keyof TFields]: InferField<TFields[K]>;
      }
    : never;

export class Resource<
  TName extends string = string,
  TFields extends FieldMap = FieldMap,
  TTable = unknown,
> {
  readonly name: TName;
  readonly table?: TTable;
  readonly fields: TFields;
  readonly meta?: Record<string, unknown>;

  private formFactory?: (
    builder: ResourceLayoutBuilder<TFields>,
  ) => SchemaNode[];

  constructor(name: TName, config: ResourceConfig<TFields, TTable>) {
    this.name = name;
    this.table = config.table;
    this.fields = config.fields;
    this.meta = config.meta;
  }

  form(
    factory: (builder: ResourceLayoutBuilder<TFields>) => SchemaNode[],
  ): this {
    this.formFactory = factory;
    return this;
  }

  toSchema(): ResourceSchema<TName, TFields> {
    const fields = Object.fromEntries(
      Object.entries(this.fields).map(([name, field]) => [
        name,
        field.toSchema(name),
      ]),
    ) as ResourceSchema<TName, TFields>["fields"];

    return {
      type: "resource",
      name: this.name,
      fields,
      tree: this.formFactory
        ? this.formFactory(new ResourceLayoutBuilder(fields))
        : Object.values(fields),
      meta: this.meta,
    };
  }
}

export class ResourceLayoutBuilder<TFields extends FieldMap> {
  private readonly fields: ResourceSchema<string, TFields>["fields"];

  constructor(fields: ResourceSchema<string, TFields>["fields"]) {
    this.fields = fields;
  }

  field<TName extends keyof TFields & string>(name: TName): FieldNode {
    return this.fields[name] as FieldNode;
  }

  section(
    title: string,
    children: readonly ((keyof TFields & string) | SchemaNode)[],
  ): SectionNode {
    return {
      type: "section",
      title,
      children: children.map((child) =>
        typeof child === "string" ? this.field(child) : child,
      ),
    };
  }

  grid(
    columns: number,
    children: readonly ((keyof TFields & string) | SchemaNode)[],
  ): GridNode {
    return {
      type: "grid",
      columns,
      children: children.map((child) =>
        typeof child === "string" ? this.field(child) : child,
      ),
    };
  }
}
