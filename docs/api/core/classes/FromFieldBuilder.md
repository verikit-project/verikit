[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / FromFieldBuilder

# Class: FromFieldBuilder\<TColumn\>

Defined in: fields/from.d.ts:22

Fluent builder for consume-mode column enrichment.

`from(column)` is not a field type. It enriches an existing field with
storage-column metadata so adapters can map resources to existing schemas.

## Type Parameters

### TColumn

`TColumn`

## Constructors

### Constructor

> **new FromFieldBuilder**\<`TColumn`\>(`column`): `FromFieldBuilder`\<`TColumn`\>

Defined in: fields/from.d.ts:24

#### Parameters

##### column

`TColumn`

#### Returns

`FromFieldBuilder`\<`TColumn`\>

## Methods

### as()

> **as**\<`TValue`, `TSchema`, `TBuilder`\>(`field`): `TBuilder`

Defined in: fields/from.d.ts:28

Attach this column source to a concrete field definition.

#### Type Parameters

##### TValue

`TValue`

##### TSchema

`TSchema` *extends* [`FieldSchema`](../interfaces/FieldSchema.md)

##### TBuilder

`TBuilder` *extends* [`FieldBuilder`](FieldBuilder.md)\<`TValue`, `TSchema`\>

#### Parameters

##### field

`TBuilder`

#### Returns

`TBuilder`

***

### options()

> **options**\<`TOptions`\>(`options`): [`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\] \| `null` \| `undefined`, [`FromSelectFieldSchema`](../interfaces/FromSelectFieldSchema.md)\<`TOptions`\[`number`\]\>\>

Defined in: fields/from.d.ts:32

Shortcut for mapping a consumed column to a select field.

#### Type Parameters

##### TOptions

`TOptions` *extends* readonly [`OptionValue`](../type-aliases/OptionValue.md)[]

#### Parameters

##### options

`TOptions`

#### Returns

[`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\] \| `null` \| `undefined`, [`FromSelectFieldSchema`](../interfaces/FromSelectFieldSchema.md)\<`TOptions`\[`number`\]\>\>
