import { AnyFieldBuilder, FieldSchema, InferField } from "../fields/base.js";
import type { BelongsToManyRelationshipBuilder } from "../relationships/belongs-to-many.js";
import type { BelongsToManyRelationshipSchema } from "../relationships/belongs-to-many.js";
import type { BelongsToRelationshipBuilder } from "../relationships/belongs-to.js";
import type { BelongsToRelationshipSchema } from "../relationships/belongs-to.js";
import type { HasManyRelationshipBuilder } from "../relationships/has-many.js";
import type { HasManyRelationshipSchema } from "../relationships/has-many.js";

/** Map of field names to their builders. */
export type FieldMap = Record<string, AnyFieldBuilder>;

/** A finalized field, tagged for the layout tree. */
export interface FieldNode extends FieldSchema {
  type: "field";
}

/** Union of the finalized relationship schema shapes. */
export type RelationshipSchema =
  | BelongsToRelationshipSchema
  | HasManyRelationshipSchema
  | BelongsToManyRelationshipSchema;

/** Finalized relationship schema used in layout trees. */
export type RelationshipNode = RelationshipSchema;

/**
 * Structural shape shared by belongsTo/hasMany/belongsToMany, whose concrete
 * builders/objects have no common base class — only `toSchema` is uniform.
 */
export interface AnyRelationshipBuilder {
  toSchema(name?: string): RelationshipSchema;
}

/** Map of relationship names to their builders. */
export type RelationshipMap = Record<string, AnyRelationshipBuilder>;

/** A titled group of layout children. */
export interface SectionNode {
  type: "section";
  title: string;
  children: SchemaNode[];
}

/** A fixed-column grid of layout children. */
export interface GridNode {
  type: "grid";
  columns: number;
  children: SchemaNode[];
}

/** A set of titled tabs, each holding its own layout children. */
export interface TabsNode {
  type: "tabs";
  tabs: readonly {
    title: string;
    children: SchemaNode[];
  }[];
}

/** A sequence of titled steps, each holding its own layout children. */
export interface WizardNode {
  type: "wizard";
  steps: readonly {
    title: string;
    children: SchemaNode[];
  }[];
}

/** A repeatable group of layout children (e.g. a dynamic list of entries). */
export interface RepeaterNode {
  type: "repeater";
  name: string;
  children: SchemaNode[];
}

/** A named action (e.g. a button) with optional input fields. */
export interface ActionNode {
  type: "action";
  name: string;
  label?: string;
  input?: SchemaNode[];
}

/** Discriminated union of every node type that can appear in a layout tree. */
export type SchemaNode =
  | FieldNode
  | RelationshipNode
  | SectionNode
  | GridNode
  | TabsNode
  | WizardNode
  | RepeaterNode
  | ActionNode;

/**
 * Serializable resource schema produced by `Resource.toSchema()`.
 */
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

/** Configuration passed to `defineResource()`. */
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

/** Extracts the plain value shape of a resource's fields (e.g. for form values). */
export type InferResourceFields<TResource> =
  TResource extends Resource<string, infer TFields, unknown, RelationshipMap>
    ? {
        [K in keyof TFields]: InferField<TFields[K]>;
      }
    : never;

/** Maps a relationship builder to its inferred value type. */
type InferRelationship<TRelationship> =
  TRelationship extends BelongsToRelationshipBuilder<infer TResource>
    ? InferResource<TResource> | null
    : TRelationship extends HasManyRelationshipBuilder<infer TResource>
      ? InferResource<TResource>[]
      : TRelationship extends BelongsToManyRelationshipBuilder<infer TResource>
        ? InferResource<TResource>[]
        : never;

/** Maps relationship builders to their inferred value types. */
type InferResourceRelationships<TRelationships extends RelationshipMap> =
  string extends keyof TRelationships
    ? Record<never, never>
    : {
        [K in keyof TRelationships]: InferRelationship<TRelationships[K]>;
      };

/** Infers the plain runtime shape of a resource: its fields merged with its relationship values. */
export type InferResource<TResource> =
  TResource extends Resource<
    string,
    infer TFields,
    unknown,
    infer TRelationships
  >
    ? InferResourceFields<Resource<string, TFields, unknown, TRelationships>> &
        InferResourceRelationships<TRelationships>
    : never;

/**
 * Immutable resource definition.
 * Finalize with `.toSchema()` to produce a serializable resource schema.
 */
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

  /** @throws {Error} If a field and relationship share the same name. */
  constructor(
    name: TName,
    config: ResourceConfig<TFields, TTable, TRelationships>,
  ) {
    const relationshipNames = new Set(Object.keys(config.relationships ?? {}));
    const duplicateName = Object.keys(config.fields).find((fieldName) =>
      relationshipNames.has(fieldName),
    );

    if (duplicateName) {
      throw new Error(
        `Resource "${name}" cannot define both a field and relationship named "${duplicateName}".`,
      );
    }

    this.name = name;
    this.table = config.table;
    this.fields = config.fields;
    this.relationships = (config.relationships ?? {}) as TRelationships;
    this.meta = config.meta;
  }

  /** Attaches a form layout factory; returns `this` for chaining. */
  form(
    factory: (
      builder: ResourceLayoutBuilder<TFields, TRelationships>,
    ) => SchemaNode[],
  ): this {
    this.formFactory = factory;
    return this;
  }

  /**
   * Finalizes fields and relationships into schemas and builds the layout
   * tree (via the form factory if `.form()` was called, otherwise a flat
   * list of fields in declaration order).
   */
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

/** A layout child: a field/relationship name to resolve, or a literal node. */
type LayoutChild<
  TFields extends FieldMap,
  TRelationships extends RelationshipMap,
> = (keyof TFields & string) | (keyof TRelationships & string) | SchemaNode;

/**
 * Builder passed into `.form()` factories; resolves field/relationship
 * names into schema nodes and assembles them into layout tree nodes.
 */
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

  /** Returns the finalized field node for `name`. @throws {Error} If unknown. */
  field<TName extends keyof TFields & string>(name: TName): FieldNode {
    if (!Object.hasOwn(this.fields, name)) {
      throw new Error(`Unknown field "${name}" in resource layout.`);
    }

    return this.fields[name] as FieldNode;
  }

  /** Returns the finalized relationship node for `name`. @throws {Error} If unknown. */
  relationship<TName extends keyof TRelationships & string>(
    name: TName,
  ): RelationshipNode {
    if (!Object.hasOwn(this.relationships, name)) {
      throw new Error(`Unknown relationship "${name}" in resource layout.`);
    }

    return this.relationships[name] as RelationshipNode;
  }

  /** Resolves a layout child to its corresponding schema node. */
  private resolveChild(
    child: LayoutChild<TFields, TRelationships>,
  ): SchemaNode {
    if (typeof child !== "string") {
      return child;
    }

    const isField = Object.hasOwn(this.fields, child);
    const isRelationship = Object.hasOwn(this.relationships, child);

    if (isField && isRelationship) {
      throw new Error(
        `Ambiguous layout child "${child}" matches both a field and relationship.`,
      );
    }
    if (isField) {
      return this.field(child as keyof TFields & string);
    }
    if (isRelationship) {
      return this.relationship(child as keyof TRelationships & string);
    }

    throw new Error(`Unknown layout child "${child}" in resource layout.`);
  }

  private resolveChildren(
    children: readonly LayoutChild<TFields, TRelationships>[],
  ): SchemaNode[] {
    return children.map((child) => this.resolveChild(child));
  }

  /** Builds a titled `SectionNode` from the given children. */
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

  /** Builds a `GridNode` with the given column count and children. */
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

  /** Builds a `TabsNode`, resolving each tab's children. */
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

  /** Builds a `WizardNode`, resolving each step's children. */
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

  /** Builds a `RepeaterNode` from the given name and children. */
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

  /** Builds an `ActionNode` with an optional label and input children. */
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
