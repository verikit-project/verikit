import { FieldBuilder, FieldSchema, FieldSource, OptionValue } from "./base.js";

export interface TextFieldSchema extends FieldSchema {
  fieldType:
    | "text"
    | "textarea"
    | "email"
    | "file"
    | "image"
    | "date"
    | "datetime";
  minLength?: number;
  maxLength?: number;
  format?: "email";
  accept?: readonly string[];
}

export class TextFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, TextFieldSchema> {
  constructor(state: Omit<TextFieldSchema, "type" | "name">) {
    super(state);
  }

  min(length: number): TextFieldBuilder<TValue> {
    return new TextFieldBuilder({ ...this.state, minLength: length });
  }

  max(length: number): TextFieldBuilder<TValue> {
    return new TextFieldBuilder({ ...this.state, maxLength: length });
  }
}

function textLike<TValue = string | null | undefined>(
  fieldType: TextFieldSchema["fieldType"],
  extra: Partial<Omit<TextFieldSchema, "type" | "name" | "fieldType">> = {},
): TextFieldBuilder<TValue> {
  return new TextFieldBuilder<TValue>({ fieldType, ...extra });
}

export function text(): TextFieldBuilder {
  return textLike("text");
}

export function textarea(): TextFieldBuilder {
  return textLike("textarea");
}

export function date(): TextFieldBuilder<Date | string | null | undefined> {
  return textLike("date");
}

export function datetime(): TextFieldBuilder<Date | string | null | undefined> {
  return textLike("datetime");
}

export function file(accept?: readonly string[]): TextFieldBuilder {
  return textLike("file", { accept });
}

export function image(): TextFieldBuilder {
  return textLike("image", { accept: ["image/*"] });
}

export interface SelectFieldSchema<
  TValue extends OptionValue = OptionValue,
> extends FieldSchema {
  fieldType: "select";
  options?: readonly { label: string; value: TValue }[];
}

export class SelectFieldBuilder<
  TValue extends OptionValue = OptionValue,
> extends FieldBuilder<TValue | null | undefined, SelectFieldSchema<TValue>> {
  constructor(
    state: Omit<SelectFieldSchema<TValue>, "type" | "name"> = {
      fieldType: "select",
    },
  ) {
    super(state);
  }

  options<const TOptions extends readonly TValue[]>(
    options: TOptions,
  ): FieldBuilder<
    TOptions[number] | null | undefined,
    SelectFieldSchema<TOptions[number]>
  >;
  options<const TOptions extends readonly { label: string; value: TValue }[]>(
    options: TOptions,
  ): FieldBuilder<
    TOptions[number]["value"] | null | undefined,
    SelectFieldSchema<TOptions[number]["value"]>
  >;
  options(options: readonly (TValue | { label: string; value: TValue })[]) {
    const normalized = options.map((option) =>
      typeof option === "object" && option !== null && "value" in option
        ? option
        : { label: String(option), value: option as TValue },
    );

    return new FieldBuilder({
      ...this.state,
      options: normalized,
    });
  }
}

export function select<
  TValue extends OptionValue = OptionValue,
>(): SelectFieldBuilder<TValue> {
  return new SelectFieldBuilder<TValue>();
}

export interface FromFieldSchema extends FieldSchema {
  fieldType: "from";
  source: FieldSource;
}

export class FromFieldBuilder<TColumn> extends FieldBuilder<
  unknown,
  FromFieldSchema
> {
  constructor(column: TColumn) {
    super({
      fieldType: "from",
      source: {
        mode: "consume",
        column,
      },
    });
  }

  as<TValue, TSchema extends FieldSchema>(
    field: FieldBuilder<TValue, TSchema>,
  ): FieldBuilder<TValue, TSchema> {
    const { type: _type, name: _name, ...state } = field.toSchema("__from__");

    return new FieldBuilder<TValue, TSchema>({
      ...state,
      source: this.state.source,
    } as Omit<TSchema, "type" | "name">);
  }

  options<const TOptions extends readonly OptionValue[]>(
    options: TOptions,
  ): FieldBuilder<
    TOptions[number] | null | undefined,
    SelectFieldSchema<TOptions[number]>
  > {
    return this.as(select<OptionValue>().options(options));
  }
}

export function from<TColumn>(column: TColumn): FromFieldBuilder<TColumn> {
  return new FromFieldBuilder(column);
}
