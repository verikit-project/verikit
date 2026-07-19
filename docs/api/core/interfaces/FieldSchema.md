[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / FieldSchema

# Interface: FieldSchema

Defined in: fields/base.d.ts:51

Serializable field schema shared between builders and adapters.
Type-specific extensions belong in `meta`.

## Extended by

- [`BooleanFieldSchema`](BooleanFieldSchema.md)
- [`DateFieldSchema`](DateFieldSchema.md)
- [`DateTimeFieldSchema`](DateTimeFieldSchema.md)
- [`FromFieldSchema`](FromFieldSchema.md)
- [`NumberFieldSchema`](NumberFieldSchema.md)
- [`FieldNode`](FieldNode.md)

## Properties

### defaultValue?

> `optional` **defaultValue?**: `unknown`

Defined in: fields/base.d.ts:77

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

***

### description?

> `optional` **description?**: `string`

Defined in: fields/base.d.ts:61

Help text explaining the field's purpose

***

### fieldType

> **fieldType**: [`FieldType`](../type-aliases/FieldType.md)

Defined in: fields/base.d.ts:57

The input type category (text, select, boolean, etc.)

***

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: fields/base.d.ts:73

Field should not be displayed in forms or tables (stored but hidden from UI)

***

### label?

> `optional` **label?**: `string`

Defined in: fields/base.d.ts:59

Display label shown to users in forms and tables (e.g., "Email Address")

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: fields/base.d.ts:85

Vendor-specific or adapter-specific metadata (e.g., custom component params)

***

### name

> **name**: `string`

Defined in: fields/base.d.ts:55

Unique identifier for this field within its resource

***

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: fields/base.d.ts:67

Field can store null as an explicit value (distinct from undefined/omitted)

***

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<[`OptionValue`](../type-aliases/OptionValue.md)\>[]

Defined in: fields/base.d.ts:79

Enumerated options for select-type fields

***

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: fields/base.d.ts:63

Placeholder text for empty form inputs

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: fields/base.d.ts:75

Field is visible but cannot be edited; display-only in forms

***

### required?

> `optional` **required?**: `boolean`

Defined in: fields/base.d.ts:65

Field must have a non-null, non-undefined value; form submission fails without it

***

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: fields/base.d.ts:69

Field supports full-text search in list/table queries

***

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: fields/base.d.ts:71

Column can be used for sorting in tables

***

### source?

> `optional` **source?**: [`FieldSource`](FieldSource.md)\<`unknown`\>

Defined in: fields/base.d.ts:83

Consume-mode reference to a column

***

### type

> **type**: `"field"`

Defined in: fields/base.d.ts:53

Literal "field" discriminator for discriminated unions

***

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`\>

Defined in: fields/base.d.ts:81

Attached validator (Zod schema, Valibot, etc.) for runtime validation
