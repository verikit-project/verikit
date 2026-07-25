[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / FieldNode

# Interface: FieldNode

Defined in: resource/resource.d.ts:11

A finalized field, tagged for the layout tree.

## Extends

- [`FieldSchema`](FieldSchema.md)

## Properties

### defaultValue?

> `optional` **defaultValue?**: `unknown`

Defined in: fields/base.d.ts:77

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`defaultValue`](FieldSchema.md#defaultvalue)

***

### description?

> `optional` **description?**: `string`

Defined in: fields/base.d.ts:61

Help text explaining the field's purpose

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`description`](FieldSchema.md#description)

***

### fieldType

> **fieldType**: [`FieldType`](../type-aliases/FieldType.md)

Defined in: fields/base.d.ts:57

The input type category (text, select, boolean, etc.)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`fieldType`](FieldSchema.md#fieldtype)

***

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: fields/base.d.ts:73

Field should not be displayed in forms or tables (stored but hidden from UI)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`hidden`](FieldSchema.md#hidden)

***

### label?

> `optional` **label?**: `string`

Defined in: fields/base.d.ts:59

Display label shown to users in forms and tables (e.g., "Email Address")

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`label`](FieldSchema.md#label)

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: fields/base.d.ts:85

Vendor-specific or adapter-specific metadata (e.g., custom component params)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`meta`](FieldSchema.md#meta)

***

### name

> **name**: `string`

Defined in: fields/base.d.ts:55

Unique identifier for this field within its resource

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`name`](FieldSchema.md#name)

***

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: fields/base.d.ts:67

Field can store null as an explicit value (distinct from undefined/omitted)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`nullable`](FieldSchema.md#nullable)

***

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<[`OptionValue`](../type-aliases/OptionValue.md)\>[]

Defined in: fields/base.d.ts:79

Enumerated options for select-type fields

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`options`](FieldSchema.md#options)

***

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: fields/base.d.ts:63

Placeholder text for empty form inputs

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`placeholder`](FieldSchema.md#placeholder)

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: fields/base.d.ts:75

Field is visible but cannot be edited; display-only in forms

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`readOnly`](FieldSchema.md#readonly)

***

### required?

> `optional` **required?**: `boolean`

Defined in: fields/base.d.ts:65

Field must have a non-null, non-undefined value; form submission fails without it

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`required`](FieldSchema.md#required)

***

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: fields/base.d.ts:69

Field supports full-text search in list/table queries

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`searchable`](FieldSchema.md#searchable)

***

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: fields/base.d.ts:71

Column can be used for sorting in tables

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`sortable`](FieldSchema.md#sortable)

***

### source?

> `optional` **source?**: [`FieldSource`](FieldSource.md)\<`unknown`\>

Defined in: fields/base.d.ts:83

Consume-mode reference to a column

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`source`](FieldSchema.md#source)

***

### type

> **type**: `"field"`

Defined in: resource/resource.d.ts:12

Literal "field" discriminator for discriminated unions

#### Overrides

[`FieldSchema`](FieldSchema.md).[`type`](FieldSchema.md#type)

***

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`\>

Defined in: fields/base.d.ts:81

Attached validator (Zod schema, Valibot, etc.) for runtime validation

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`validation`](FieldSchema.md#validation)
