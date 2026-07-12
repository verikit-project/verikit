export type Primitive = string | number | boolean | Date | null | undefined;

export interface StandardSchemaLike<Input = unknown, Output = Input> {
  readonly "~standard"?: {
    readonly version: number;
    readonly vendor: string;
    validate(value: unknown): Output | Promise<Output>;
  };
  parse?(value: unknown): Output;
  safeParse?(value: unknown): unknown;
}

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "select"
  | "boolean"
  | "date"
  | "datetime"
  | "file"
  | "image"
  | "belongsTo"
  | "from";

export type OptionValue = string | number | boolean;

export interface FieldOption<TValue extends OptionValue = OptionValue> {
  label: string;
  value: TValue;
}

export interface FieldSource<TColumn = unknown> {
  mode: "consume";
  column: TColumn;
}

export interface FieldSchema {
  type: "field";
  name: string;
  fieldType: FieldType;
  // Universal field presentation and behavior flags. Every concrete field
  // schema extends this interface, so adapters can rely on these properties.
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  nullable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  options?: readonly FieldOption[];
  validation?: StandardSchemaLike;
  source?: FieldSource;
  meta?: Record<string, unknown>;
}

export type AnyFieldBuilder = FieldBuilder<any, any>;

export type InferField<TField> = TField extends {
  readonly $value: infer TValue;
}
  ? TValue
  : never;

export type FieldBuilderState<TSchema extends FieldSchema = FieldSchema> = Omit<
  TSchema,
  "type" | "name"
>;

export class FieldBuilder<
  TValue = unknown,
  TSchema extends FieldSchema = FieldSchema,
> {
  readonly $value!: TValue;

  protected readonly state: FieldBuilderState<TSchema>;

  constructor(state: FieldBuilderState<TSchema>) {
    this.state = state;
  }

  protected withState<TNextValue = TValue>(
    patch: Partial<FieldSchema>,
  ): FieldBuilder<TNextValue, TSchema> {
    return new FieldBuilder<TNextValue, TSchema>({
      ...this.state,
      ...patch,
    } as FieldBuilderState<TSchema>);
  }

  label(label: string): FieldBuilder<TValue, TSchema> {
    return this.withState({ label });
  }

  description(description: string): FieldBuilder<TValue, TSchema> {
    return this.withState({ description });
  }

  placeholder(placeholder: string): FieldBuilder<TValue, TSchema> {
    return this.withState({ placeholder });
  }

  required(): FieldBuilder<NonNullable<TValue>, TSchema> {
    return this.withState<NonNullable<TValue>>({
      nullable: false,
      required: true,
    });
  }

  optional(): FieldBuilder<TValue | undefined, TSchema> {
    return this.withState<TValue | undefined>({ required: false });
  }

  nullable(): FieldBuilder<TValue | null, TSchema> {
    return this.withState<TValue | null>({ nullable: true });
  }

  default(value: TValue): FieldBuilder<Exclude<TValue, undefined>, TSchema> {
    return this.withState<Exclude<TValue, undefined>>({ defaultValue: value });
  }

  searchable(): FieldBuilder<TValue, TSchema> {
    return this.withState({ searchable: true });
  }

  sortable(): FieldBuilder<TValue, TSchema> {
    return this.withState({ sortable: true });
  }

  hidden(): FieldBuilder<TValue, TSchema> {
    return this.withState({ hidden: true });
  }

  readOnly(): FieldBuilder<TValue, TSchema> {
    return this.withState({ readOnly: true });
  }

  rules<TOutput = TValue>(
    validation: StandardSchemaLike<unknown, TOutput>,
  ): FieldBuilder<TOutput, TSchema> {
    return this.withState<TOutput>({ validation });
  }

  meta(meta: Record<string, unknown>): FieldBuilder<TValue, TSchema> {
    return this.withState({
      meta: {
        ...this.state.meta,
        ...meta,
      },
    });
  }

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

export function createField<TValue, TSchema extends FieldSchema = FieldSchema>(
  fieldType: TSchema["fieldType"],
  state: Partial<FieldBuilderState<TSchema>> = {},
): FieldBuilder<TValue, TSchema> {
  return new FieldBuilder<TValue, TSchema>({
    fieldType,
    ...state,
  } as FieldBuilderState<TSchema>);
}
