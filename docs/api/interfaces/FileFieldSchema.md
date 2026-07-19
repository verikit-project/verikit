[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / FileFieldSchema

# Interface: FileFieldSchema

Defined in: [fields/file.ts:14](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/file.ts#L14)

Schema describing a generic file upload field.

## Extends

- `FileConstraints`

## Properties

### accept?

> `optional` **accept?**: readonly `string`[]

Defined in: [fields/shared/file-constraints.ts:7](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/shared/file-constraints.ts#L7)

#### Inherited from

`FileConstraints.accept`

---

### defaultValue?

> `optional` **defaultValue?**: `unknown`

Defined in: [fields/base.ts:101](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L101)

Fallback value if the field is not provided (e.g., radio default, checkbox unchecked)

#### Inherited from

`FileConstraints.defaultValue`

---

### description?

> `optional` **description?**: `string`

Defined in: [fields/base.ts:85](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L85)

Help text explaining the field's purpose

#### Inherited from

`FileConstraints.description`

---

### fieldType

> **fieldType**: `"file"`

Defined in: [fields/file.ts:15](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/file.ts#L15)

The input type category (text, select, boolean, etc.)

#### Overrides

`FileConstraints.fieldType`

---

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: [fields/base.ts:97](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L97)

Field should not be displayed in forms or tables (stored but hidden from UI)

#### Inherited from

`FileConstraints.hidden`

---

### label?

> `optional` **label?**: `string`

Defined in: [fields/base.ts:83](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L83)

Display label shown to users in forms and tables (e.g., "Email Address")

#### Inherited from

`FileConstraints.label`

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [fields/shared/file-constraints.ts:8](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/shared/file-constraints.ts#L8)

#### Inherited from

`FileConstraints.maxSize`

---

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`>\>

Defined in: [fields/base.ts:109](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L109)

Vendor-specific or adapter-specific metadata (e.g., custom component params)

#### Inherited from

`FileConstraints.meta`

---

### multiple?

> `optional` **multiple?**: `boolean`

Defined in: [fields/shared/file-constraints.ts:9](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/shared/file-constraints.ts#L9)

#### Inherited from

`FileConstraints.multiple`

---

### name

> **name**: `string`

Defined in: [fields/base.ts:75](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L75)

Unique identifier for this field within its resource

#### Inherited from

`FileConstraints.name`

---

### nullable?

> `optional` **nullable?**: `boolean`

Defined in: [fields/base.ts:91](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L91)

Field can store null as an explicit value (distinct from undefined/omitted)

#### Inherited from

`FileConstraints.nullable`

---

### options?

> `optional` **options?**: readonly [`FieldOption`](FieldOption.md)\<[`OptionValue`](../type-aliases/OptionValue.md)>\>[]

Defined in: [fields/base.ts:103](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L103)

Enumerated options for select-type fields

#### Inherited from

`FileConstraints.options`

---

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: [fields/base.ts:87](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L87)

Placeholder text for empty form inputs

#### Inherited from

`FileConstraints.placeholder`

---

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: [fields/base.ts:99](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L99)

Field is visible but cannot be edited; display-only in forms

#### Inherited from

`FileConstraints.readOnly`

---

### required?

> `optional` **required?**: `boolean`

Defined in: [fields/base.ts:89](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L89)

Field must have a non-null, non-undefined value; form submission fails without it

#### Inherited from

`FileConstraints.required`

---

### searchable?

> `optional` **searchable?**: `boolean`

Defined in: [fields/base.ts:93](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L93)

Field supports full-text search in list/table queries

#### Inherited from

`FileConstraints.searchable`

---

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [fields/base.ts:95](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L95)

Column can be used for sorting in tables

#### Inherited from

`FileConstraints.sortable`

---

### source?

> `optional` **source?**: [`FieldSource`](FieldSource.md)\<`unknown`>\>

Defined in: [fields/base.ts:107](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L107)

Consume-mode reference to a column

#### Inherited from

`FileConstraints.source`

---

### type

> **type**: `"field"`

Defined in: [fields/base.ts:73](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L73)

Literal "field" discriminator for discriminated unions

#### Inherited from

`FileConstraints.type`

---

### validation?

> `optional` **validation?**: [`StandardSchemaLike`](StandardSchemaLike.md)\<`unknown`, `unknown`>\>

Defined in: [fields/base.ts:105](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L105)

Attached validator (Zod schema, Valibot, etc.) for runtime validation

#### Inherited from

`FileConstraints.validation`
