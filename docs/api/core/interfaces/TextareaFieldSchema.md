[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / TextareaFieldSchema

# Interface: TextareaFieldSchema

Defined in: fields/textarea.d.ts:6

Schema describing a multi-line text field.

## Extends

- `StringLengthConstraints`

## Properties

### defaultValue?

> `optional` **defaultValue?**: `unknown`

Defined in: fields/base.d.ts:77

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

#### Inherited from

`StringLengthConstraints.defaultValue`

***

### description?

> `optional` **description?**: `string`

Defined in: fields/base.d.ts:61

Help text explaining the field's purpose

#### Inherited from

`StringLengthConstraints.description`

***

### fieldType

> **fieldType**: `"textarea"`

Defined in: fields/textarea.d.ts:7

The input type category (text, select, boolean, etc.)

#### Overrides

`StringLengthConstraints.fieldType`

***

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: fields/base.d.ts:73

Field should not be displayed in forms or tables (stored but hidden from UI)

#### Inherited from

`StringLengthConstraints.hidden`

***

### label?

> `optional` **label?**: `string`

Defined in: fields/base.d.ts:59

Display label shown to users in forms and tables (e.g., "Email Address")

#### Inherited from

`StringLengthConstraints.label`

***

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: fields/shared/string-constraints.d.ts:7

#### Inherited from

`StringLengthConstraints.maxLength`

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: fields/base.d.ts:85

Vendor-specific or adapter-specific metadata (e.g., custom component params)

#### Inherited from

`StringLengthConstraints.meta`

***

### minLength?

> `optional` **minLength?**: `number`

Defined in: fields/shared/string-constraints.d.ts:6

#### Inherited from

`StringLengthConstraints.minLength`

***

### name

> **name**: `string`

Defined in: fields/base.d.ts:55

Unique identifier for this field within its resource

#### Inherited from

`StringLengthConstraints.name`

***

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: fields/base.d.ts:67

Field can store null as an explicit value (distinct from undefined/omitted)

#### Inherited from

`StringLengthConstraints.nullable`

***

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<[`OptionValue`](../type-aliases/OptionValue.md)\>[]

Defined in: fields/base.d.ts:79

Enumerated options for select-type fields

#### Inherited from

`StringLengthConstraints.options`

***

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: fields/base.d.ts:63

Placeholder text for empty form inputs

#### Inherited from

`StringLengthConstraints.placeholder`

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: fields/base.d.ts:75

Field is visible but cannot be edited; display-only in forms

#### Inherited from

`StringLengthConstraints.readOnly`

***

### required?

> `optional` **required?**: `boolean`

Defined in: fields/base.d.ts:65

Field must have a non-null, non-undefined value; form submission fails without it

#### Inherited from

`StringLengthConstraints.required`

***

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: fields/base.d.ts:69

Field supports full-text search in list/table queries

#### Inherited from

`StringLengthConstraints.searchable`

***

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: fields/base.d.ts:71

Column can be used for sorting in tables

#### Inherited from

`StringLengthConstraints.sortable`

***

### source?

> `optional` **source?**: [`FieldSource`](FieldSource.md)\<`unknown`\>

Defined in: fields/base.d.ts:83

Consume-mode reference to a column

#### Inherited from

`StringLengthConstraints.source`

***

### type

> **type**: `"field"`

Defined in: fields/base.d.ts:53

Literal "field" discriminator for discriminated unions

#### Inherited from

`StringLengthConstraints.type`

***

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`\>

Defined in: fields/base.d.ts:81

Attached validator (Zod schema, Valibot, etc.) for runtime validation

#### Inherited from

`StringLengthConstraints.validation`
