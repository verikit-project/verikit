import { cloneValue } from "../utils/clone.js";

/** Primitive type underlying all field value types in the schema. */
export type Primitive = string | number | boolean | Date | null | undefined;

/**
 * Standard Schema interface compatible with Zod, Valibot, ArkType, and
 * similar libraries; lets `.validation()` accept any compliant validator.
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
 * Discriminated union of supported field input types.
 * Each type maps to a UI component in adapters and defines how data is processed.
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

/** Metadata for consume-mode fields that reference an existing database column. */
export interface FieldSource<TColumn = unknown> {
  /**
   * The consumption mode. Currently only "consume" is supported (derive field from column).
   * "generate" mode is implicit when `source` is undefined.
   */
  mode: "consume";
  /** Reference to the column being consumed */
  column: TColumn;
}

/**
 * Serializable field schema shared between builders and adapters.
 * Type-specific extensions belong in `meta`.
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

  /** Display label shown to users in forms and tables (e.g., "Email Address") */
  label?: string;
  /** Help text explaining the field's purpose */
  description?: string;
  /** Placeholder text for empty form inputs */
  placeholder?: string;
  /** Field must have a non-null, non-undefined value; form submission fails without it */
  required?: boolean;
  /** Field can store null as an explicit value (distinct from undefined/omitted) */
  nullable?: boolean;
  /** Field supports full-text search in list/table queries */
  searchable?: boolean;
  /** Column can be used for sorting in tables */
  sortable?: boolean;
  /** Field should not be displayed in forms or tables (stored but hidden from UI) */
  hidden?: boolean;
  /** Field is visible but cannot be edited; display-only in forms */
  readOnly?: boolean;
  /** Fallback value if the field is not provided (e.g., radio default, checkbox unchecked) */
  defaultValue?: unknown;
  /** Enumerated options for select-type fields */
  options?: readonly FieldOption[];
  /** Attached validator (Zod schema, Valibot, etc.) for runtime validation */
  validation?: StandardSchemaLike;
  /** Consume-mode reference to a column */
  source?: FieldSource;
  /** Vendor-specific or adapter-specific metadata (e.g., custom component params) */
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
 * Internal type representing the mutable state of a FieldBuilder.
 * Excludes "type" and "name" since those are set only at finalization.
 */
export type FieldBuilderState<TSchema extends FieldSchema = FieldSchema> = Omit<
  TSchema,
  "type" | "name"
>;

/**
 * Preserves the current concrete builder shape while replacing its inferred
 * value type. This keeps subclass methods available after base modifiers like
 * `.label()`, `.required()`, or `.nullable()`.
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

function fieldConstraintIssue(
  state: FieldBuilderState<FieldSchema>,
  value: unknown,
): string | undefined {
  const constraints = state as FieldBuilderState<FieldSchema> &
    Record<string, unknown>;

  if (value === undefined) {
    return "Default value cannot be undefined.";
  }

  if (value === null) {
    return state.nullable === true ? undefined : "This field cannot be null.";
  }

  switch (state.fieldType) {
    case "text":
    case "textarea":
    case "email": {
      if (typeof value !== "string") {
        return "Must be a string.";
      }
      if (
        typeof constraints.minLength === "number" &&
        value.length < constraints.minLength
      ) {
        return `Must be at least ${constraints.minLength} characters.`;
      }
      if (
        typeof constraints.maxLength === "number" &&
        value.length > constraints.maxLength
      ) {
        return `Must be at most ${constraints.maxLength} characters.`;
      }
      return undefined;
    }

    case "number": {
      if (typeof value !== "number") {
        return "Must be a number.";
      }
      if (!Number.isFinite(value)) {
        return "Must be a finite number.";
      }
      if (typeof constraints.min === "number" && value < constraints.min) {
        return `Must be at least ${constraints.min}.`;
      }
      if (typeof constraints.max === "number" && value > constraints.max) {
        return `Must be at most ${constraints.max}.`;
      }
      if (typeof constraints.step === "number") {
        const base = typeof constraints.min === "number" ? constraints.min : 0;
        const steps = (value - base) / constraints.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-9) {
          return `Must be a multiple of ${constraints.step}.`;
        }
      }
      return undefined;
    }

    case "boolean":
      return typeof value === "boolean" ? undefined : "Must be a boolean.";

    case "date":
    case "datetime": {
      if (!(value instanceof Date) && typeof value !== "string") {
        return "Must be a valid date.";
      }
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? "Must be a valid date." : undefined;
    }

    case "select": {
      if (
        !Array.isArray(constraints.options) ||
        constraints.options.length === 0
      ) {
        return "Select fields must define at least one option.";
      }
      return constraints.options.some(
        (option) =>
          typeof option === "object" &&
          option !== null &&
          "value" in option &&
          option.value === value,
      )
        ? undefined
        : "Must be one of the allowed options.";
    }

    case "file":
    case "image":
      return undefined;

    default:
      return undefined;
  }
}

function assertDefaultSatisfiesConstraints(
  state: FieldBuilderState<FieldSchema>,
): void {
  if (!Object.hasOwn(state, "defaultValue")) {
    return;
  }

  const message = fieldConstraintIssue(state, state.defaultValue);
  if (message) {
    throw new Error(
      `Default value does not satisfy field constraints: ${message}`,
    );
  }
}

/**
 * Immutable fluent builder for field schemas: each modifier method returns a
 * new builder with updated state and TValue narrowed/widened accordingly.
 * Call `.toSchema(name)` to finalize into a `FieldSchema`.
 */
export class FieldBuilder<
  TValue = unknown,
  TSchema extends FieldSchema = FieldSchema,
> {
  /**
   * Phantom property used by InferField to extract TValue.
   * Does not exist at runtime; used only for type inference.
   */
  readonly $value!: TValue;

  /**
   * Internal mutable state of the builder.
   * Exposed as protected so subclasses can access and extend state.
   */
  protected readonly state: FieldBuilderState<TSchema>;

  /**
   * Typically constructed via `createField()` or a field-type helper
   * (`text()`, `select()`, etc.), not directly.
   */
  constructor(state: FieldBuilderState<TSchema>) {
    this.state = cloneBuilderState(state);
  }

  /**
   * Creates a new instance of the current concrete builder (via
   * `this.constructor`) so subclass methods stay available after chaining.
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
   * Returns builder state without finalizing via `toSchema(name)`; used
   * internally to compose builders (e.g. `from(column).as(field)`).
   * @internal
   */
  getState(): FieldBuilderState<TSchema> {
    return cloneBuilderState(this.state);
  }

  /**
   * Returns a sourced copy of this builder while preserving the concrete
   * builder type; used by `from(column).as(field)`.
   * @internal
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

  /** Marks the field required, narrowing TValue and forcing nullable: false. */
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
   * Sets a form-level fallback value (not a database DEFAULT) and excludes
   * undefined from TValue.
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

  /** Hides the field from forms and tables. */
  hidden(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ hidden: true } as Partial<TSchema>);
  }

  /** Makes the field display-only in forms. */
  readOnly(): FieldBuilderWithValue<this, TValue, TSchema> {
    return this.withState({ readOnly: true } as Partial<TSchema>);
  }

  /**
   * Attaches a StandardSchema validator (Zod, Valibot, ArkType, etc.); its
   * output type becomes the new TValue.
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
   * Finalizes the builder into a `FieldSchema`.
   * @throws {Error} If `name` is empty or whitespace-only.
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
 * Creates a field builder.
 * Used internally by helpers such as `text()` and `select()`.
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
