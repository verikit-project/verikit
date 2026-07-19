[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / FromSelectFieldSchema

# Interface: FromSelectFieldSchema\<TValue\>

Defined in: fields/from.d.ts:12

Schema produced by the `from(column).options(...)` shortcut.

## Extends

- `OptionFieldSchema`\<`TValue`\>

## Type Parameters

### TValue

`TValue` *extends* [`OptionValue`](../type-aliases/OptionValue.md) = [`OptionValue`](../type-aliases/OptionValue.md)

## Properties

### defaultValue?

> `optional` **defaultValue?**: `unknown`

Defined in: fields/base.d.ts:77

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

#### Inherited from

`OptionFieldSchema.defaultValue`

***

### description?

> `optional` **description?**: `string`

Defined in: fields/base.d.ts:61

Help text explaining the field's purpose

#### Inherited from

`OptionFieldSchema.description`

***

### fieldType

> **fieldType**: `"select"`

Defined in: fields/from.d.ts:13

The input type category (text, select, boolean, etc.)

#### Overrides

`OptionFieldSchema.fieldType`

***

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: fields/base.d.ts:73

Field should not be displayed in forms or tables (stored but hidden from UI)

#### Inherited from

`OptionFieldSchema.hidden`

***

### label?

> `optional` **label?**: `string`

Defined in: fields/base.d.ts:59

Display label shown to users in forms and tables (e.g., "Email Address")

#### Inherited from

`OptionFieldSchema.label`

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: fields/base.d.ts:85

Vendor-specific or adapter-specific metadata (e.g., custom component params)

#### Inherited from

`OptionFieldSchema.meta`

***

### name

> **name**: `string`

Defined in: fields/base.d.ts:55

Unique identifier for this field within its resource

#### Inherited from

`OptionFieldSchema.name`

***

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: fields/base.d.ts:67

Field can store null as an explicit value (distinct from undefined/omitted)

#### Inherited from

`OptionFieldSchema.nullable`

***

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<`TValue`\>[]

Defined in: fields/shared/options.d.ts:6

Enumerated options for select-type fields

#### Inherited from

`OptionFieldSchema.options`

***

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: fields/base.d.ts:63

Placeholder text for empty form inputs

#### Inherited from

`OptionFieldSchema.placeholder`

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: fields/base.d.ts:75

Field is visible but cannot be edited; display-only in forms

#### Inherited from

`OptionFieldSchema.readOnly`

***

### required?

> `optional` **required?**: `boolean`

Defined in: fields/base.d.ts:65

Field must have a non-null, non-undefined value; form submission fails without it

#### Inherited from

`OptionFieldSchema.required`

***

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: fields/base.d.ts:69

Field supports full-text search in list/table queries

#### Inherited from

`OptionFieldSchema.searchable`

***

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: fields/base.d.ts:71

Column can be used for sorting in tables

#### Inherited from

`OptionFieldSchema.sortable`

***

### source

> **source**: [`FieldSource`](FieldSource.md)

Defined in: fields/from.d.ts:14

Consume-mode reference to a column

#### Overrides

`OptionFieldSchema.source`

***

### type

> **type**: `"field"`

Defined in: fields/base.d.ts:53

Literal "field" discriminator for discriminated unions

#### Inherited from

`OptionFieldSchema.type`

***

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`\>

Defined in: fields/base.d.ts:81

Attached validator (Zod schema, Valibot, etc.) for runtime validation

#### Inherited from

`OptionFieldSchema.validation`
