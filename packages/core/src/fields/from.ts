import { FieldBuilder, FieldSchema, FieldSource, OptionValue } from "./base.js";
import { normalizeOptions, OptionFieldSchema } from "./shared/options.js";

/**
 * Schema extension for fields derived from an existing storage column.
 */
export interface FromFieldSchema extends FieldSchema {
  source: FieldSource;
}

/**
 * Schema produced by the `from(column).options(...)` shortcut.
 */
export interface FromSelectFieldSchema<
  TValue extends OptionValue = OptionValue,
> extends OptionFieldSchema<TValue> {
  fieldType: "select";
  source: FieldSource;
}

/**
 * Fluent builder for consume-mode column enrichment.
 *
 * `from(column)` is not a field type. It attaches storage-column metadata to
 * a real field so adapters can connect resource semantics to existing schemas.
 */
export class FromFieldBuilder<TColumn> extends FieldBuilder<
  unknown,
  FromFieldSchema
> {
  constructor(column: TColumn) {
    super({
      fieldType: "text",
      source: {
        mode: "consume",
        column,
      },
    });
  }

  /**
   * Attach this column source to a concrete field definition.
   */
  as<TValue, TSchema extends FieldSchema>(
    field: FieldBuilder<TValue, TSchema>,
  ): FieldBuilder<TValue, TSchema> {
    const { type: _type, name: _name, ...state } = field.toSchema("__from__");

    return new FieldBuilder<TValue, TSchema>({
      ...state,
      source: this.state.source,
    } as Omit<TSchema, "type" | "name">);
  }

  /**
   * Shortcut for enriching a consumed column as a select field.
   */
  options<const TOptions extends readonly OptionValue[]>(
    options: TOptions,
  ): FieldBuilder<
    TOptions[number] | null | undefined,
    FromSelectFieldSchema<TOptions[number]>
  > {
    return new FieldBuilder({
      fieldType: "select",
      source: this.state.source,
      options: normalizeOptions(options),
    });
  }
}

/**
 * Start a consume-mode field from an existing storage column.
 */
export function from<TColumn>(column: TColumn): FromFieldBuilder<TColumn> {
  return new FromFieldBuilder(column);
}
