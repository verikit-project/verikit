[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / FieldSchema

# Interface: FieldSchema

Defined in: [fields/base.ts:71](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L71)

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

Defined in: [fields/base.ts:101](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L101)

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

---

### description?

> `optional` **description?**: `string`

Defined in: [fields/base.ts:85](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L85)

Help text explaining the field's purpose

---

### fieldType

> **fieldType**: [`FieldType`](../type-aliases/FieldType.md)

Defined in: [fields/base.ts:77](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L77)

The input type category (text, select, boolean, etc.)

---

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: [fields/base.ts:97](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L97)

Field should not be displayed in forms or tables (stored but hidden from UI)

---

### label?

> `optional` **label?**: `string`

Defined in: [fields/base.ts:83](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L83)

Display label shown to users in forms and tables (e.g., "Email Address")

---

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`>>>\>

Defined in: [fields/base.ts:109](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L109)

Vendor-specific or adapter-specific metadata (e.g., custom component params)

---

### name

> **name**: `string`

Defined in: [fields/base.ts:75](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L75)

Unique identifier for this field within its resource

---

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: [fields/base.ts:91](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L91)

Field can store null as an explicit value (distinct from undefined/omitted)

---

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<[`OptionValue`](../type-aliases/OptionValue.md)>>>\>[]

Defined in: [fields/base.ts:103](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L103)

Enumerated options for select-type fields

---

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: [fields/base.ts:87](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L87)

Placeholder text for empty form inputs

---

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: [fields/base.ts:99](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L99)

Field is visible but cannot be edited; display-only in forms

---

### required?

> `optional` **required?**: `boolean`

Defined in: [fields/base.ts:89](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L89)

Field must have a non-null, non-undefined value; form submission fails without it

---

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: [fields/base.ts:93](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L93)

Field supports full-text search in list/table queries

---

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [fields/base.ts:95](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L95)

Column can be used for sorting in tables

---

### source?

> `optional` **source?**: [`FieldSource`](FieldSource.md)\<`unknown`>>>\>

Defined in: [fields/base.ts:107](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L107)

Consume-mode reference to a column

---

### type

> **type**: `"field"`

Defined in: [fields/base.ts:73](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L73)

Literal "field" discriminator for discriminated unions

---

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`>>>\>

Defined in: [fields/base.ts:105](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L105)

Attached validator (Zod schema, Valibot, etc.) for runtime validation
