/**
 * Primitive type representing basic JavaScript/database types.
 * Used as the foundation for all field value types in the schema.
 */
export type Primitive = string | number | boolean | Date | null | undefined;

/**
 * Standard Schema interface compatible with Zod, Valibot, ArkType, and other validation libraries.
 * Allows fields to use any StandardSchema-compliant validator via the `.validation()` method.
 * 
 * @template Input - The input type accepted by the validator
 * @template Output - The validated/transformed output type
 * 
 * @example
 * ```typescript
 * createField<string>("text")
 *   .validation(z.string().email().toLowerCase())
 * ```
 */
export interface StandardSchemaLike<Input = unknown, Output = Input> {
  readonly "~standard"?: {
    readonly version: number;
    readonly vendor: string;
    validate(value: unknown): Output | Promise<Output>;
  };
  parse?(value: unknown): Output;
  safeParse?(value: unknown): unknown;
}

/**
 * Discriminated union of supported field input types.
 * Each type maps to a UI component in adapters and defines how data is processed.
 */
export type FieldType =
  | "text"          // Single-line text input
  | "textarea"      // Multi-line text input
  | "email"         // Email input with validation
  | "number"        // Numeric input
  | "select"        // Dropdown/select from options
  | "boolean"       // Toggle/checkbox
  | "date"          // Date picker
  | "datetime"      // Date and time picker
  | "file"          // File upload
  | "image";        // Image upload

/**
 * Allowed value types for select/option fields.
 * Kept simple to ensure serialization and compatibility across adapters.
 */
export type OptionValue = string | number | boolean;

/**
 * A single option for select-type fields.
 * 
 * @template TValue - The value type (string, number, or boolean)
 * 
 * @example
 * ```typescript
 * { label: "Admin", value: "admin" }
 * { label: "Active", value: true }
 * ```
 */
export interface FieldOption<TValue extends OptionValue = OptionValue> {
  label: string;
  value: TValue;
}

/**
 * Metadata for consume-mode fields that reference an existing database column.
 * Used when building resources from existing schemas.
 * 
 * @template TColumn - The column type being consumed
 */
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
 * The complete schema definition for a single field.
 * Serves as the serializable intermediate representation between builder and adapters.
 * All adapters (forms, tables, API endpoints, OpenAPI) consume this structure.
 * 
 * Universal flags apply across all adapters; specific field types may add vendor-specific extensions via `meta`.
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

/**
 * Type alias for any FieldBuilder instance.
 * Useful for generic adapter functions that accept any field builder.
 */
export type AnyFieldBuilder = FieldBuilder<any, any>;

/**
 * Utility type to extract the inferred value type from a FieldBuilder.
 * 
 * @template TField - A FieldBuilder type
 * @returns The TValue type parameter of the builder
 * 
 * @example
 * ```typescript
 * const field = createField<string>("email").required();
 * type EmailValue = InferField<typeof field>; // string (non-nullable)
 * ```
 */
export type InferField<TField> = TField extends {
  readonly $value: infer TValue;
}
  ? TValue
  : never;

/**
 * Internal type representing the mutable state of a FieldBuilder.
 * Excludes "type" and "name" since those are set only at finalization.
 * 
 * @template TSchema - The FieldSchema or subtype being built
 */
export type FieldBuilderState<TSchema extends FieldSchema = FieldSchema> = Omit<
  TSchema,
  "type" | "name"
>;

/**
 * Fluent builder for constructing strongly-typed field schemas.
 * 
 * The builder maintains type safety through its generic TValue parameter:
 * - `.required()` narrows `TValue` to `NonNullable<TValue>`
 * - `.optional()` widens `TValue` to `TValue | undefined`
 * - `.nullable()` widens `TValue` to `TValue | null`
 * - `.validation(validator)` can transform `TValue` to a validated output type
 * 
 * Call `.toSchema(name)` to finalize and produce a `FieldSchema`.
 * 
 * @template TValue - The inferred runtime type of the field value
 * @template TSchema - The schema interface type (defaults to FieldSchema)
 * 
 * @example
 * ```typescript
 * const emailField = createField<string>("email")
 *   .label("Email Address")
 *   .required()
 *   .searchable()
 *   .toSchema("email");
 * 
 * type EmailType = InferField<typeof emailField>; // string
 * ```
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
   * Construct a FieldBuilder from initial state.
   * Typically called via createField() or field type helpers (text(), select(), etc.).
   * 
   * @param state - Partial FieldSchema properties (fieldType, label, validation, etc.)
   */
  constructor(state: FieldBuilderState<TSchema>) {
    this.state = state;
  }

  /**
   * Internal helper to create a new builder with updated state.
   * Returns a fresh FieldBuilder instance (immutable pattern).
   * 
   * @template TNextValue - The new TValue for the returned builder
   * @param patch - Properties to merge into the current state
   * @returns A new FieldBuilder with the updated state
   */
  protected withState<TNextValue = TValue>(
    patch: Partial<FieldSchema>,
  ): FieldBuilder<TNextValue, TSchema> {
    return new FieldBuilder<TNextValue, TSchema>({
      ...this.state,
      ...patch,
    } as FieldBuilderState<TSchema>);
  }

  /**
   * Set a human-readable label for the field.
   * Displayed in forms, tables, and documentation.
   * 
   * @param label - The label text (e.g., "Email Address", "Date of Birth")
   * @returns A new builder with the label set
   * 
   * @example
   * ```typescript
   * createField<string>("text")
   *   .label("First Name")
   * ```
   */
  label(label: string): FieldBuilder<TValue, TSchema> {
    return this.withState({ label });
  }

  /**
   * Set help text describing the field's purpose or constraints.
   * Displayed as secondary text in forms.
   * 
   * @param description - Help text (e.g., "Must be a valid email address")
   * @returns A new builder with the description set
   * 
   * @example
   * ```typescript
   * createField<string>("text")
   *   .description("Enter your full name as it appears on your ID")
   * ```
   */
  description(description: string): FieldBuilder<TValue, TSchema> {
    return this.withState({ description });
  }

  /**
   * Set placeholder text shown in empty form inputs.
   * Does not apply to all field types (e.g., toggles, selects).
   * 
   * @param placeholder - Placeholder text (e.g., "john@example.com")
   * @returns A new builder with the placeholder set
   * 
   * @example
   * ```typescript
   * createField<string>("email")
   *   .placeholder("you@example.com")
   * ```
   */
  placeholder(placeholder: string): FieldBuilder<TValue, TSchema> {
    return this.withState({ placeholder });
  }

  /**
   * Mark the field as required.
   * Cannot be null or undefined; form submission fails without a value.
   * 
   * Narrows the inferred type to NonNullable<TValue>.
   * Sets runtime flags: required: true, nullable: false.
   * 
   * @returns A new builder with TValue narrowed to NonNullable<TValue>
   * 
   * @example
   * ```typescript
   * createField<string | undefined>("text")
   *   .required()  // Type is now string (not undefined)
   * ```
   */
  required(): FieldBuilder<NonNullable<TValue>, TSchema> {
    return this.withState<NonNullable<TValue>>({
      nullable: false,
      required: true,
    });
  }

  /**
   * Mark the field as optional.
   * Can be omitted from form submission; undefined is a valid state.
   * Does NOT allow null; nullable must be called separately if null is needed.
   * 
   * Widens the inferred type to TValue | undefined.
   * Sets runtime flags: required: false, nullable: false.
   * 
   * @returns A new builder with TValue widened to TValue | undefined
   * 
   * @example
   * ```typescript
   * createField<string>("text")
   *   .optional()  // Type is now string | undefined
   * ```
   */
  optional(): FieldBuilder<TValue | undefined, TSchema> {
    return this.withState<TValue | undefined>({
      required: false,
      nullable: false,
    });
  }

  /**
   * Allow the field to store null as an explicit value.
   * Distinct from undefined; represents "no value" in the database.
   * Not required; null is an allowed value.
   * 
   * Widens the inferred type to TValue | null.
   * Sets runtime flags: nullable: true, required: false.
   * 
   * Common in consume mode for existing nullable database columns.
   * 
   * @returns A new builder with TValue widened to TValue | null
   * 
   * @example
   * ```typescript
   * // From column: varchar("notes").nullable()
   * createField<string>("text")
   *   .nullable()  // Type is now string | null
   * ```
   */
  nullable(): FieldBuilder<TValue | null, TSchema> {
    return this.withState<TValue | null>({ nullable: true, required: false });
  }

  /**
   * Set a default value for the field.
   * Used when a value is not provided; removes undefined from the type.
   * Not the same as a database DEFAULT; this is a form-level fallback.
   * 
   * @template Excludes undefined from TValue, leaving other types intact
   * @param value - The default value (must be of type TValue)
   * @returns A new builder with TValue narrowed to exclude undefined
   * 
   * @example
   * ```typescript
   * createField<boolean | undefined>("boolean")
   *   .default(false)  // Type is now boolean
   * ```
   */
  default(value: TValue): FieldBuilder<Exclude<TValue, undefined>, TSchema> {
    return this.withState<Exclude<TValue, undefined>>({ defaultValue: value });
  }

  /**
   * Mark the field as searchable in list/table views.
   * Enables full-text or substring search in queries.
   * 
   * @returns A new builder with searchable: true
   * 
   * @example
   * ```typescript
   * createField<string>("text")
   *   .label("Email")
   *   .searchable()  // Can search by email in tables
   * ```
   */
  searchable(): FieldBuilder<TValue, TSchema> {
    return this.withState({ searchable: true });
  }

  /**
   * Mark the field as sortable in table columns.
   * Allows users to sort rows by this field's value.
   * 
   * @returns A new builder with sortable: true
   * 
   * @example
   * ```typescript
   * createField<string>("text")
   *   .label("Name")
   *   .sortable()  // Table can sort by name
   * ```
   */
  sortable(): FieldBuilder<TValue, TSchema> {
    return this.withState({ sortable: true });
  }

  /**
   * Hide the field from forms and tables.
   * The field is still stored and accessible programmatically,
   * but never shown to end users in the UI.
   * 
   * @returns A new builder with hidden: true
   * 
   * @example
   * ```typescript
   * createField<Date>("date")
   *   .hidden()  // createdAt timestamp, internal use only
   * ```
   */
  hidden(): FieldBuilder<TValue, TSchema> {
    return this.withState({ hidden: true });
  }

  /**
   * Make the field read-only in forms.
   * Visible to users, but cannot be edited; display-only.
   * Useful for computed fields or audit columns.
   * 
   * @returns A new builder with readOnly: true
   * 
   * @example
   * ```typescript
   * createField<number>("number")
   *   .label("Total")
   *   .readOnly()  // Computed from other fields
   * ```
   */
  readOnly(): FieldBuilder<TValue, TSchema> {
    return this.withState({ readOnly: true });
  }

  /**
   * Attach a StandardSchema validator (Zod, Valibot, ArkType, etc.).
   * The validator runs on form submission and can transform the value.
   * 
   * The output type of the validator becomes the new TValue.
   * Allows validators to refine or transform data (e.g., string → lowercase string).
   * 
   * @template TOutput - The output type of the validator (becomes the new TValue)
   * @param validation - A StandardSchema-compliant validator
   * @returns A new builder with TValue narrowed to the validator's output type
   * 
   * @example
   * ```typescript
   * createField<string>("email")
   *   .validation(z.string().email())  // Type remains string, but validated
   * 
   * createField<string>("text")
   *   .validation(z.string().toLowerCase())  // Output is lowercase string
   * ```
   */
  validation<TOutput = TValue>(
    validation: StandardSchemaLike<unknown, TOutput>,
  ): FieldBuilder<TOutput, TSchema> {
    return this.withState<TOutput>({ validation });
  }

  /**
   * Attach vendor-specific or adapter-specific metadata.
   * Merged with any existing metadata; non-destructive.
   * Used by adapters to store component props, styling hints, or custom config.
   * 
   * @param meta - Key-value pairs of metadata
   * @returns A new builder with metadata merged
   * 
   * @example
   * ```typescript
   * createField<string>("text")
   *   .meta({ maxLength: 50, pattern: "^[A-Z]" })
   * ```
   */
  meta(meta: Record<string, unknown>): FieldBuilder<TValue, TSchema> {
    return this.withState({
      meta: {
        ...this.state.meta,
        ...meta,
      },
    });
  }

  /**
   * Finalize the builder and produce a FieldSchema.
   * This is the last step before passing the schema to adapters or resources.
   * 
   * Validates that the field name is non-empty.
   * 
   * @param name - The unique field identifier within its resource
   * @returns A complete FieldSchema ready for use
   * @throws {Error} If name is empty or contains only whitespace
   * 
   * @example
   * ```typescript
   * const emailSchema = createField<string>("email")
   *   .label("Email Address")
   *   .required()
   *   .toSchema("email");  // name: "email"
   * ```
   */
  toSchema(name: string): TSchema {
    if (name.trim().length === 0) {
      throw new Error("Field schema names must be non-empty strings.");
    }

    return {
      type: "field",
      name,
      ...this.state,
    } as TSchema;
  }
}

/**
 * Factory function to create a new FieldBuilder.
 * Entry point for the fluent builder API.
 * 
 * All field types (text, email, number, select, boolean, date, file, image)
 * call this function with their specific fieldType.
 * 
 * @template TValue - The inferred value type of the field
 * @template TSchema - The schema type (defaults to FieldSchema)
 * @param fieldType - The input type category (text, select, boolean, etc.)
 * @param state - Optional initial state (label, description, options, etc.)
 * @returns A new FieldBuilder ready for chaining
 * 
 * @example
 * ```typescript
 * // Direct usage (uncommon)
 * createField<string>("text")
 *   .label("Name")
 *   .toSchema("name");
 * 
 * // Typical usage via type helpers
 * text().label("Name").toSchema("name");
 * email().required().toSchema("email");
 * select().options([...]).toSchema("role");
 * ```
 */
export function createField<TValue, TSchema extends FieldSchema = FieldSchema>(
  fieldType: TSchema["fieldType"],
  state: Partial<FieldBuilderState<TSchema>> = {},
): FieldBuilder<TValue, TSchema> {
  return new FieldBuilder<TValue, TSchema>({
    fieldType,
    ...state,
  } as FieldBuilderState<TSchema>);
}
