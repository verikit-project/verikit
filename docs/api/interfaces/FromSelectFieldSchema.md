[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / FromSelectFieldSchema

# Interface: FromSelectFieldSchema\<TValue\>

Defined in: [fields/from.ts:15](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/from.ts#L15)

Schema produced by the `from(column).options(...)` shortcut.

## Extends

- `OptionFieldSchema`\<`TValue`\>

## Type Parameters

### TValue

`TValue` *extends* [`OptionValue`](../type-aliases/OptionValue.md) = [`OptionValue`](../type-aliases/OptionValue.md)

## Properties

### defaultValue?

> `optional` **defaultValue?**: `unknown`

Defined in: [fields/base.ts:101](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L101)

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

#### Inherited from

`OptionFieldSchema.defaultValue`

***

### description?

> `optional` **description?**: `string`

Defined in: [fields/base.ts:85](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L85)

Help text explaining the field's purpose

#### Inherited from

`OptionFieldSchema.description`

***

### fieldType

> **fieldType**: `"select"`

Defined in: [fields/from.ts:18](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/from.ts#L18)

The input type category (text, select, boolean, etc.)

#### Overrides

`OptionFieldSchema.fieldType`

***

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: [fields/base.ts:97](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L97)

Field should not be displayed in forms or tables (stored but hidden from UI)

#### Inherited from

`OptionFieldSchema.hidden`

***

### label?

> `optional` **label?**: `string`

Defined in: [fields/base.ts:83](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L83)

Display label shown to users in forms and tables (e.g., "Email Address")

#### Inherited from

`OptionFieldSchema.label`

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: [fields/base.ts:109](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L109)

Vendor-specific or adapter-specific metadata (e.g., custom component params)

#### Inherited from

`OptionFieldSchema.meta`

***

### name

> **name**: `string`

Defined in: [fields/base.ts:75](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L75)

Unique identifier for this field within its resource

#### Inherited from

`OptionFieldSchema.name`

***

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: [fields/base.ts:91](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L91)

Field can store null as an explicit value (distinct from undefined/omitted)

#### Inherited from

`OptionFieldSchema.nullable`

***

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<`TValue`\>[]

Defined in: [fields/shared/options.ts:9](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/shared/options.ts#L9)

Enumerated options for select-type fields

#### Inherited from

`OptionFieldSchema.options`

***

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: [fields/base.ts:87](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L87)

Placeholder text for empty form inputs

#### Inherited from

`OptionFieldSchema.placeholder`

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: [fields/base.ts:99](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L99)

Field is visible but cannot be edited; display-only in forms

#### Inherited from

`OptionFieldSchema.readOnly`

***

### required?

> `optional` **required?**: `boolean`

Defined in: [fields/base.ts:89](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L89)

Field must have a non-null, non-undefined value; form submission fails without it

#### Inherited from

`OptionFieldSchema.required`

***

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: [fields/base.ts:93](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L93)

Field supports full-text search in list/table queries

#### Inherited from

`OptionFieldSchema.searchable`

***

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [fields/base.ts:95](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L95)

Column can be used for sorting in tables

#### Inherited from

`OptionFieldSchema.sortable`

***

### source

> **source**: [`FieldSource`](FieldSource.md)

Defined in: [fields/from.ts:19](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/from.ts#L19)

Consume-mode reference to a column

#### Overrides

`OptionFieldSchema.source`

***

### type

> **type**: `"field"`

Defined in: [fields/base.ts:73](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L73)

Literal "field" discriminator for discriminated unions

#### Inherited from

`OptionFieldSchema.type`

***

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`\>

Defined in: [fields/base.ts:105](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L105)

Attached validator (Zod schema, Valibot, etc.) for runtime validation

#### Inherited from

`OptionFieldSchema.validation`
