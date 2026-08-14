import { cloneValue } from "../utils/clone.js";
import { validateBuiltInFieldConstraints } from "./shared/built-in-constraints.js";

/** Primitive type underlying all field value types in the schema. */
export type Primitive = string | number | boolean | Date | null | undefined;

/**
 * Standard Schema interface compatible with Zod, Valibot, ArkType, and similar libraries; lets `.validation()` accept any compliant validator.
 */
export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: readonly unknown[];
}

export type StandardSchemaResult<Output> =
  | { readonly value: Output }
  | { readonly issues: readonly StandardSchemaIssue[] };

export interface StandardSchemaLike<Input = unknown, Output = Input> {
  readonly "~standard"?: {
    readonly version: number;
    readonly vendor: string;
    validate(
      value: Input,
    ): StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  };
  parse?(value: unknown): Output;
  safeParse?(value: unknown): unknown;
}

/**
 * Discriminated union of supported field input types. Each type maps to a UI component in adapters and defines how data is processed.
 */
export type FieldType =
  | "text" // Single-line text input
  | "textarea" // Multi-line text input
  | "email" // Email input with validation
  | "number" // Numeric input
  | "select" // Dropdown/select from options
  | "boolean" // Toggle/checkbox
  | "date" // Date picker
  | "datetime" // Date and time picker
  | "file" // File upload
  | "image"; // Image upload

/** Allowed value types for select/option fields, kept serialization-safe. */
export type OptionValue = string | number | boolean;

/** A single option for select-type fields. */
export interface FieldOption<TValue extends OptionValue = OptionValue> {
  label: string;
  value: TValue;
}

/**
 * Metadata for consume-mode fields that reference an existing database column.
 */
export interface FieldSource<TColumn = unknown> {
  /**
   * The consumption mode. Currently only "consume" is supported (derive field from column). "generate" mode is implicit when `source` is undefined.
   */
  mode: "consume";
  /** Reference to the column being consumed */
  column: TColumn;
}

/**
 * Declarative visibility condition, evaluated against sibling field values:
 * a field with `equals`/`in` is shown only when the referenced sibling's
 * value matches; a field with neither set is shown when the sibling's value
 * is truthy.
 */
export interface FieldCondition {
  /** Name of the sibling field this condition depends on. */
  field: string;
  /** Shown only when the sibling's value strictly equals this. */
  equals?: Primitive;
  /** Shown only when the sibling's value is one of these. */
  in?: readonly Primitive[];
}

/**
 * Serializable field schema shared between builders and adapters. Type-specific extensions belong in `meta`.
 */
export interface FieldSchema {
  /** Literal "field" discriminator for discriminated unions */
  type: "field";
  /** Unique identifier for this field within its resource */
  name: string;
  /** The input type category (text, select, boolean, etc.) */
  fieldType: FieldType;

  // Universal presentation and behavior flags
  // Every adapter relies on these properties; do not remove or change semantics.

  /**
   * Display label shown to users in forms and tables (e.g., "Email Address")
   */
  label?: string;
  /** Help text explaining the field's purpose */
  description?: string;
  /** Placeholder text for empty form inputs */
  placeholder?: string;
  /**
   * Field must have a non-null, non-undefined value; form submission fails without it
   */
  required?: boolean;
  /**
   * Field can store null as an explicit value (distinct from undefined/omitted)
   */
  nullable?: boolean;
  /** Field supports full-text search in list/table queries */
  searchable?: boolean;
  /** Column can be used for sorting in tables */
  sortable?: boolean;
  /** Column can be used for exact and range filters in list requests. */
  filterable?: boolean;
  /**
   * Field should not be displayed in forms or tables (stored but hidden from UI)
   */
  hidden?: boolean;
  /** Field should not be displayed in forms, but still appears as a table column. */
  formHidden?: boolean;
  /** Field should not appear as a table column, but still appears in forms. */
  tableHidden?: boolean;
  /**
   * Field is visible in both forms and tables but never editable: rendered
   * display-only in forms, and its value is never included in a create or
   * update submission regardless of write permissions.
   */
  readOnly?: boolean;
  /**
   * Marks this field as backed by a unique storage constraint.
   * Adapters surface violations as field validation issues using
   * `uniqueMessage` or a default message.
   *
   * Does not create the database constraint; it must be defined separately.
   */
  unique?: boolean;
  /**
   * Custom message used when this field's unique constraint is violated.
   * Only meaningful when `unique` is true; falls back to a generic message
   * naming the field when omitted.
   */
  uniqueMessage?: string;
  /**
   * Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)
   */
  defaultValue?: unknown;
  /** Enumerated options for select-type fields */
  options?: readonly FieldOption[];
  /** Attached validator (Zod schema, Valibot, etc.) for runtime validation */
  validation?: StandardSchemaLike;
  /** Consume-mode reference to a column */
  source?: FieldSource;
  /**
   * Shows this field only when a sibling field's value matches. A field
   * hidden by an unmet condition is treated like `.formHidden()` for
   * validation/inference/submission purposes  see `shouldValidateField`.
   */
  condition?: FieldCondition;
  /**
   * Vendor-specific or adapter-specific metadata (e.g., custom component params)
   */
  meta?: Record<string, unknown>;
}

/** Alias for any FieldBuilder instance, for generic adapter functions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional wildcard for "any concrete FieldBuilder"
export type AnyFieldBuilder = FieldBuilder<any, any>;

/** Extracts the inferred value type from a FieldBuilder. */
export type InferField<TField> = TField extends {
  readonly $value: infer TValue;
}
  ? TValue
  : never;

/**
 * Internal type representing the mutable state of a FieldBuilder. Excludes "type" and "name" since those are set only at finalization.
 */
export type FieldBuilderState<TSchema extends FieldSchema = FieldSchema> = Omit<
  TSchema,
  "type" | "name"
>;

/**
 * Preserves the current concrete builder shape while replacing its inferred value type. This keeps subclass methods available after base modifiers like `.label()`, `.required()`, or `.nullable()`.
 */
export type FieldBuilderWithValue<
  TBuilder,
  TValue,
  TSchema extends FieldSchema,
> = Omit<TBuilder, "$value"> & FieldBuilder<TValue, TSchema>;

type BuilderConstructor<TBuilder, TSchema extends FieldSchema> = new (
  state: FieldBuilderState<TSchema>,
) => TBuilder;

function cloneBuilderState<TSchema extends FieldSchema>(
  state: FieldBuilderState<TSchema>,
): FieldBuilderState<TSchema> {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      key === "validation" ? value : cloneValue(value),
    ]),
  ) as FieldBuilderState<TSchema>;
}

function assertDefaultSatisfiesConstraints(
  state: FieldBuilderState<FieldSchema>,
): void {
  if (!Object.hasOwn(state, "defaultValue")) {
    return;
  }

  if (state.defaultValue === undefined) {
    throw new Error(
      "Default value does not satisfy field constraints: Default value cannot be undefined.",
    );
  }

  if (state.defaultValue === null) {
    if (state.nullable === true) {
      return;
    }

    throw new Error(
      "Default value does not satisfy field constraints: This field cannot be null.",
    );
  }

  const [fieldIssue] = validateBuiltInFieldConstraints(
    {
      type: "field",
      name: "$default",
      ...state,
    },
    state.defaultValue,
  );
  const message = fieldIssue?.message;

  if (message) {
    throw new Error(
      `Default value does not satisfy field constraints: ${message}`,
    );
  }
}

/**
 * Immutable fluent builder for field schemas: each modifier method returns a new builder with updated state and TValue narrowed/widened accordingly. Call `.toSchema(name)` to finalize into a `FieldSchema`.
 */
export class FieldBuilder<
  TValue = unknown,
  TSchema extends FieldSchema = FieldSchema,
> {
  /**
   * Phantom property used by InferField to extract TValue. Does not exist at runtime; used only for type inference.
   */
  readonly $value!: TValue;

  /**
   * Internal mutable state of the builder. Exposed as protected so subclasses can access and extend state.
   */
  protected readonly state: FieldBuilderState<TSchema>;

  /**
   * Typically constructed via `createField()` or a field-type helper (`text()`, `select()`, etc.), not directly.
   */
  constructor(state: FieldBuilderState<TSchema>) {
    this.state = cloneBuilderState(state);
  }

  /**
   * Creates a new instance of the current concrete builder (via `this.constructor`) so subclass methods stay available after chaining.
   */
  protected withState<TNextValue = TValue>(
    patch: Partial<TSchema>,
  ): FieldBuilderWithValue<this, TNextValue, TSchema> {
    const Builder = this.constructor as BuilderConstructor<this, TSchema>;
    const nextState = {
      ...this.state,
      ...patch,
    } as FieldBuilderState<TSchema>;

    assertDefaultSatisfiesConstraints(nextState);

    return new Builder(nextState) as unknown as FieldBuilderWithValue<
      this,
      TNextValue,
      TSchema
    >;
  }

  /**
   * Returns builder state without finalizing via `toSchema(name)`; used internally to compose builders (e.g. `from(column).as(field)`). @internal
   */
  getState(): FieldBuilderState<TSchema> {
    return cloneBuilderState(this.state);
  }

  /**
   * Returns a sourced copy of this builder while preserving the concrete builder type; used by `from(column).as(field)`. @internal
   */
  withSource(source: FieldSource): this {
    return this.withState({ source } as Partial<TSchema>) as this;
  }

  /** Sets the field's display label. */
  label(label: string): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ label } as Partial<TSchema>);
  }

  /** Sets help text describing the field's purpose. */
  description(
    description: string,
  ): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ description } as Partial<TSchema>);
  }

  /** Sets placeholder text for empty form inputs. */
  placeholder(
    placeholder: string,
  ): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ placeholder } as Partial<TSchema>);
  }

  /**
   * Marks the field required, narrowing TValue and forcing nullable: false.
   */
  required(): FieldBuilderWithValue<this, NonNullable<TValue>, TSchema> {
    return this.withState<NonNullable<TValue>>({
      nullable: false,
      required: true,
    } as Partial<TSchema>);
  }

  /** Marks the field optional (TValue | undefined); does not allow null. */
  optional(): FieldBuilderWithValue<this, TValue | undefined, TSchema> {
    return this.withState<TValue | undefined>({
      required: false,
      nullable: false,
    } as Partial<TSchema>);
  }

  /** Allows null (TValue | null); also sets required: false. */
  nullable(): FieldBuilderWithValue<this, TValue | null, TSchema> {
    return this.withState<TValue | null>({
      nullable: true,
      required: false,
    } as Partial<TSchema>);
  }

  /**
   * Sets a form-level fallback value (not a database DEFAULT) and excludes undefined from TValue.
   */
  default(
    value: Exclude<TValue, undefined>,
  ): FieldBuilderWithValue<this, Exclude<TValue, undefined>, TSchema> {
    return this.withState<Exclude<TValue, undefined>>({
      defaultValue: value,
    } as Partial<TSchema>);
  }

  /** Marks the field searchable in list/table queries. */
  searchable(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ searchable: true } as Partial<TSchema>);
  }

  /** Marks the field sortable in table columns. */
  sortable(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ sortable: true } as Partial<TSchema>);
  }

  /** Marks the field safe for server-side structured list filtering. */
  filterable(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ filterable: true } as Partial<TSchema>);
  }

  /** Hides the field from forms and tables. */
  hidden(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ hidden: true } as Partial<TSchema>);
  }

  /** Hides the field from forms only; it still appears as a table column. */
  formHidden(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ formHidden: true } as Partial<TSchema>);
  }

  /** Hides the field from table columns only; it still appears in forms. */
  tableHidden(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ tableHidden: true } as Partial<TSchema>);
  }

  /**
   * Conditionally shows this field based on a sibling field's value.
   * See `FieldSchema.condition`.
   */
  visibleWhen(
    field: string,
    value?: Primitive | readonly Primitive[],
  ): FieldBuilderWithValue<this, TValue, TSchema> {
    const condition: FieldCondition =
      value === undefined
        ? { field }
        : Array.isArray(value)
          ? { field, in: value }
          : { field, equals: value as Primitive };

    return this.withState({ condition } as Partial<TSchema>);
  }

  /**
   * Makes the field display-only in forms, and unconditionally excludes its
   * value from create/update submissions (regardless of write permissions).
   */
  readOnly(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ readOnly: true } as Partial<TSchema>);
  }

  /**
   * Marks the field as backed by a unique constraint in storage, with an
   * optional custom message for adapters to use when that constraint is
   * violated. See `FieldSchema.unique`.
   */
  unique(message?: string): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({
      unique: true,
      ...(message !== undefined && { uniqueMessage: message }),
    } as Partial<TSchema>);
  }

  /**
   * Attaches a StandardSchema validator (Zod, Valibot, ArkType, etc.); its output type becomes the new TValue.
   */
  validation<TOutput = TValue>(
    validation: StandardSchemaLike<unknown, TOutput>,
  ): FieldBuilderWithValue<this, TOutput, TSchema> {
    return this.withState<TOutput>({ validation } as Partial<TSchema>);
  }

  /** Merges adapter-specific metadata into any existing `meta`. */
  meta(
    meta: Record<string, unknown>,
  ): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({
      meta: {
        ...this.state.meta,
        ...meta,
      },
    } as Partial<TSchema>);
  }

  /**
   * Finalizes the builder into a `FieldSchema`. @throws {Error} If `name` is empty or whitespace-only.
   */
  toSchema(name: string): TSchema {
    if (name.trim().length === 0) {
      throw new Error("Field schema names must be non-empty strings.");
    }

    return {
      type: "field",
      name,
      ...cloneBuilderState(this.state),
    } as TSchema;
  }
}

/**
 * Creates a field builder. Used internally by helpers such as `text()` and `select()`.
 */
export function createField<TValue, TSchema extends FieldSchema = FieldSchema>(
  fieldType: TSchema["fieldType"],
  state: Partial<FieldBuilderState<TSchema>> = {},
): FieldBuilder<TValue, TSchema> {
  return new FieldBuilder<TValue, TSchema>({
    ...state,
    fieldType,
  } as FieldBuilderState<TSchema>);
}
