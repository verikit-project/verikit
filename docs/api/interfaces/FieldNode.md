[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / FieldNode

# Interface: FieldNode

Defined in: [resource/resource.ts:13](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L13)

A finalized field, tagged for the layout tree.

## Extends

- [`FieldSchema`](FieldSchema.md)

## Properties

### defaultValue?

> `optional` **defaultValue?**: `unknown`

Defined in: [fields/base.ts:101](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L101)

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`defaultValue`](FieldSchema.md#defaultvalue)

---

### description?

> `optional` **description?**: `string`

Defined in: [fields/base.ts:85](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L85)

Help text explaining the field's purpose

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`description`](FieldSchema.md#description)

---

### fieldType

> **fieldType**: [`FieldType`](../type-aliases/FieldType.md)

Defined in: [fields/base.ts:77](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L77)

The input type category (text, select, boolean, etc.)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`fieldType`](FieldSchema.md#fieldtype)

---

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: [fields/base.ts:97](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L97)

Field should not be displayed in forms or tables (stored but hidden from UI)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`hidden`](FieldSchema.md#hidden)

---

### label?

> `optional` **label?**: `string`

Defined in: [fields/base.ts:83](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L83)

Display label shown to users in forms and tables (e.g., "Email Address")

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`label`](FieldSchema.md#label)

---

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`>>>\>

Defined in: [fields/base.ts:109](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L109)

Vendor-specific or adapter-specific metadata (e.g., custom component params)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`meta`](FieldSchema.md#meta)

---

### name

> **name**: `string`

Defined in: [fields/base.ts:75](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L75)

Unique identifier for this field within its resource

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`name`](FieldSchema.md#name)

---

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: [fields/base.ts:91](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L91)

Field can store null as an explicit value (distinct from undefined/omitted)

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`nullable`](FieldSchema.md#nullable)

---

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<[`OptionValue`](../type-aliases/OptionValue.md)>>>\>[]

Defined in: [fields/base.ts:103](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L103)

Enumerated options for select-type fields

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`options`](FieldSchema.md#options)

---

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: [fields/base.ts:87](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L87)

Placeholder text for empty form inputs

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`placeholder`](FieldSchema.md#placeholder)

---

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: [fields/base.ts:99](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L99)

Field is visible but cannot be edited; display-only in forms

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`readOnly`](FieldSchema.md#readonly)

---

### required?

> `optional` **required?**: `boolean`

Defined in: [fields/base.ts:89](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L89)

Field must have a non-null, non-undefined value; form submission fails without it

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`required`](FieldSchema.md#required)

---

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: [fields/base.ts:93](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L93)

Field supports full-text search in list/table queries

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`searchable`](FieldSchema.md#searchable)

---

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [fields/base.ts:95](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L95)

Column can be used for sorting in tables

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`sortable`](FieldSchema.md#sortable)

---

### source?

> `optional` **source?**: [`FieldSource`](FieldSource.md)\<`unknown`>>>\>

Defined in: [fields/base.ts:107](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L107)

Consume-mode reference to a column

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`source`](FieldSchema.md#source)

---

### type

> **type**: `"field"`

Defined in: [resource/resource.ts:14](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L14)

Literal "field" discriminator for discriminated unions

#### Overrides

[`FieldSchema`](FieldSchema.md).[`type`](FieldSchema.md#type)

---

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`>>>\>

Defined in: [fields/base.ts:105](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L105)

Attached validator (Zod schema, Valibot, etc.) for runtime validation

#### Inherited from

[`FieldSchema`](FieldSchema.md).[`validation`](FieldSchema.md#validation)
