import { AnyFieldBuilder, FieldSchema, InferField } from "../fields/base.js";
import type { BelongsToManyRelationshipSchema } from "../relationships/belongs-to-many.js";
import type { BelongsToRelationshipSchema } from "../relationships/belongs-to.js";
import type { HasManyRelationshipSchema } from "../relationships/has-many.js";

export type FieldMap = Record<string, AnyFieldBuilder>;

export interface FieldNode extends FieldSchema {
  type: "field";
}

export type RelationshipSchema =
  | BelongsToRelationshipSchema
  | HasManyRelationshipSchema
  | BelongsToManyRelationshipSchema;

export type RelationshipNode = RelationshipSchema;

/**
 * Structural shape shared by belongsTo/hasMany/belongsToMany, whose concrete
 * builders/objects have no common base class — only `toSchema` is uniform.
 */
export interface AnyRelationshipBuilder {
  toSchema(name?: string): RelationshipSchema;
}

export type RelationshipMap = Record<string, AnyRelationshipBuilder>;

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
  | RelationshipNode
  | SectionNode
  | GridNode
  | TabsNode
  | WizardNode
  | RepeaterNode
  | ActionNode;

export interface ResourceSchema<
  TName extends string = string,
  TFields extends FieldMap = FieldMap,
  TRelationships extends RelationshipMap = RelationshipMap,
> {
  type: "resource";
  name: TName;
  fields: {
    [K in keyof TFields & string]: ReturnType<TFields[K]["toSchema"]>;
  };
  relationships: {
    [K in keyof TRelationships & string]: ReturnType<
      TRelationships[K]["toSchema"]
    >;
  };
  tree: SchemaNode[];
  meta?: Record<string, unknown>;
}

export interface ResourceConfig<
  TFields extends FieldMap = FieldMap,
  TTable = unknown,
  TRelationships extends RelationshipMap = RelationshipMap,
> {
  table?: TTable;
  fields: TFields;
  relationships?: TRelationships;
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
  TRelationships extends RelationshipMap = RelationshipMap,
> {
  readonly name: TName;
  readonly table?: TTable;
  readonly fields: TFields;
  readonly relationships: TRelationships;
  readonly meta?: Record<string, unknown>;

  // Stored with the builder parameters erased to `any` so TFields/TRelationships
  // do not appear in a contravariant position here; otherwise it would make
  // Resource invariant in those params and break inference for callers (e.g.
  // relationship builders) that accept `Resource` generically.
  private formFactory?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate type erasure, see comment above
    builder: ResourceLayoutBuilder<any, any>,
  ) => SchemaNode[];

  constructor(
    name: TName,
    config: ResourceConfig<TFields, TTable, TRelationships>,
  ) {
    this.name = name;
    this.table = config.table;
    this.fields = config.fields;
    this.relationships = (config.relationships ?? {}) as TRelationships;
    this.meta = config.meta;
  }

  form(
    factory: (
      builder: ResourceLayoutBuilder<TFields, TRelationships>,
    ) => SchemaNode[],
  ): this {
    this.formFactory = factory;
    return this;
  }

  toSchema(): ResourceSchema<TName, TFields, TRelationships> {
    const fields = Object.fromEntries(
      Object.entries(this.fields).map(([name, field]) => [
        name,
        field.toSchema(name),
      ]),
    ) as ResourceSchema<TName, TFields, TRelationships>["fields"];

    const relationships = Object.fromEntries(
      Object.entries(this.relationships).map(([name, relationship]) => [
        name,
        relationship.toSchema(name),
      ]),
    ) as ResourceSchema<TName, TFields, TRelationships>["relationships"];

    return {
      type: "resource",
      name: this.name,
      fields,
      relationships,
      tree: this.formFactory
        ? this.formFactory(new ResourceLayoutBuilder(fields, relationships))
        : Object.values(fields),
      meta: this.meta,
    };
  }
}

type LayoutChild<
  TFields extends FieldMap,
  TRelationships extends RelationshipMap,
> = (keyof TFields & string) | (keyof TRelationships & string) | SchemaNode;

export class ResourceLayoutBuilder<
  TFields extends FieldMap,
  TRelationships extends RelationshipMap = RelationshipMap,
> {
  private readonly fields: ResourceSchema<
    string,
    TFields,
    TRelationships
  >["fields"];
  private readonly relationships: ResourceSchema<
    string,
    TFields,
    TRelationships
  >["relationships"];

  constructor(
    fields: ResourceSchema<string, TFields, TRelationships>["fields"],
    relationships: ResourceSchema<
      string,
      TFields,
      TRelationships
    >["relationships"],
  ) {
    this.fields = fields;
    this.relationships = relationships;
  }

  field<TName extends keyof TFields & string>(name: TName): FieldNode {
    return this.fields[name] as FieldNode;
  }

  relationship<TName extends keyof TRelationships & string>(
    name: TName,
  ): RelationshipNode {
    return this.relationships[name] as RelationshipNode;
  }

  private resolveChild(
    child: LayoutChild<TFields, TRelationships>,
  ): SchemaNode {
    if (typeof child !== "string") {
      return child;
    }
    return child in this.fields
      ? this.field(child as keyof TFields & string)
      : this.relationship(child as keyof TRelationships & string);
  }

  private resolveChildren(
    children: readonly LayoutChild<TFields, TRelationships>[],
  ): SchemaNode[] {
    return children.map((child) => this.resolveChild(child));
  }

  section(
    title: string,
    children: readonly LayoutChild<TFields, TRelationships>[],
  ): SectionNode {
    return {
      type: "section",
      title,
      children: this.resolveChildren(children),
    };
  }

  grid(
    columns: number,
    children: readonly LayoutChild<TFields, TRelationships>[],
  ): GridNode {
    return {
      type: "grid",
      columns,
      children: this.resolveChildren(children),
    };
  }

  tabs(
    tabs: readonly {
      title: string;
      children: readonly LayoutChild<TFields, TRelationships>[];
    }[],
  ): TabsNode {
    return {
      type: "tabs",
      tabs: tabs.map((tab) => ({
        title: tab.title,
        children: this.resolveChildren(tab.children),
      })),
    };
  }

  wizard(
    steps: readonly {
      title: string;
      children: readonly LayoutChild<TFields, TRelationships>[];
    }[],
  ): WizardNode {
    return {
      type: "wizard",
      steps: steps.map((step) => ({
        title: step.title,
        children: this.resolveChildren(step.children),
      })),
    };
  }

  repeater(
    name: string,
    children: readonly LayoutChild<TFields, TRelationships>[],
  ): RepeaterNode {
    return {
      type: "repeater",
      name,
      children: this.resolveChildren(children),
    };
  }

  action(
    name: string,
    options: {
      label?: string;
      input?: readonly LayoutChild<TFields, TRelationships>[];
    } = {},
  ): ActionNode {
    return {
      type: "action",
      name,
      label: options.label,
      input: options.input ? this.resolveChildren(options.input) : undefined,
    };
  }
}
