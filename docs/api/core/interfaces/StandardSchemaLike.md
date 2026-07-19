[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / StandardSchemaLike

# Interface: StandardSchemaLike\<Input, Output\>

Defined in: fields/base.d.ts:16

## Type Parameters

### Input

`Input` = `unknown`

### Output

`Output` = `Input`

## Properties

### ~standard?

> `readonly` `optional` **~standard?**: `object`

Defined in: fields/base.d.ts:17

#### vendor

> `readonly` **vendor**: `string`

#### version

> `readonly` **version**: `number`

#### validate()

> **validate**(`value`): [`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`\> \| `Promise`\<[`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`\>\>

##### Parameters

###### value

`Input`

##### Returns

[`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`\> \| `Promise`\<[`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`\>\>

## Methods

### parse()?

> `optional` **parse**(`value`): `Output`

Defined in: fields/base.d.ts:22

#### Parameters

##### value

`unknown`

#### Returns

`Output`

***

### safeParse()?

> `optional` **safeParse**(`value`): `unknown`

Defined in: fields/base.d.ts:23

#### Parameters

##### value

`unknown`

#### Returns

`unknown`
