import { FieldBuilder, FieldSchema, FieldSource, OptionValue } from "./base.js";
import { normalizeOptions, OptionFieldSchema } from "./shared/options.js";
import { cloneValue } from "../utils/clone.js";

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
 * Fluent builder for consume-mode column enrichment. `from(column)` is not a field type. It enriches an existing field with storage-column metadata so adapters can map resources to existing schemas.
 */
export class FromFieldBuilder<TColumn> {
  private readonly source: FieldSource<TColumn>;

  constructor(column: TColumn) {
    this.source = {
      mode: "consume",
      column: cloneValue(column),
    };
  }

  /**
   * Attach this column source to a concrete field definition.
   */
  as<
    TValue,
    TSchema extends FieldSchema,
    TBuilder extends FieldBuilder<TValue, TSchema>,
  >(field: TBuilder): TBuilder {
    return field.withSource(this.source);
  }

  /**
   * Shortcut for mapping a consumed column to a select field.
   */
  options<const TOptions extends readonly OptionValue[]>(
    options: TOptions,
  ): FieldBuilder<
    TOptions[number] | null | undefined,
    FromSelectFieldSchema<TOptions[number]>
  > {
    return new FieldBuilder({
      fieldType: "select",
      source: this.source,
      options: normalizeOptions(options),
    });
  }
}

/**
 * Creates a consume-mode field builder from an existing storage column.
 */
export function from<TColumn>(column: TColumn): FromFieldBuilder<TColumn> {
  return new FromFieldBuilder(column);
}
