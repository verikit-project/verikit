[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / FromFieldBuilder

# Class: FromFieldBuilder\<TColumn\>

Defined in: [fields/from.ts:28](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/from.ts#L28)

Fluent builder for consume-mode column enrichment.

`from(column)` is not a field type. It enriches an existing field with
storage-column metadata so adapters can map resources to existing schemas.

## Type Parameters

### TColumn

`TColumn`

## Constructors

### Constructor

> **new FromFieldBuilder**\<`TColumn`>(`column`): `FromFieldBuilder`\<`TColumn`>

Defined in: [fields/from.ts:31](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/from.ts#L31)

#### Parameters

##### column

`TColumn`

#### Returns

`FromFieldBuilder`\<`TColumn`\>

## Methods

### as()

> **as**\<`TValue`, `TSchema`, `TBuilder`>(`field`): `TBuilder`

Defined in: [fields/from.ts:41](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/from.ts#L41)

Attach this column source to a concrete field definition.

#### Type Parameters

##### TValue

`TValue`

##### TSchema

`TSchema` _extends_ [`FieldSchema`](../interfaces/FieldSchema.md)

##### TBuilder

`TBuilder` _extends_ [`FieldBuilder`](FieldBuilder.md)\<`TValue`, `TSchema`\>

#### Parameters

##### field

`TBuilder`

#### Returns

`TBuilder`

---

### options()

> **options**\<`TOptions`>(`options`): [`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\] \| `null` \| `undefined`, [`FromSelectFieldSchema`](../interfaces/FromSelectFieldSchema.md)\<`TOptions`\[`number`\]\>\>

Defined in: [fields/from.ts:52](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/from.ts#L52)

Shortcut for mapping a consumed column to a select field.

#### Type Parameters

##### TOptions

`TOptions` _extends_ readonly [`OptionValue`](../type-aliases/OptionValue.md)[]

#### Parameters

##### options

`TOptions`

#### Returns

[`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\] \| `null` \| `undefined`, [`FromSelectFieldSchema`](../interfaces/FromSelectFieldSchema.md)\<`TOptions`\[`number`\]\>\>
