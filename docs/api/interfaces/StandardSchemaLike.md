[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / StandardSchemaLike

# Interface: StandardSchemaLike\<Input, Output\>

Defined in: [fields/base.ts:19](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L19)

## Type Parameters

### Input

`Input` = `unknown`

### Output

`Output` = `Input`

## Properties

### ~standard?

> `readonly` `optional` **~standard?**: `object`

Defined in: [fields/base.ts:20](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L20)

#### vendor

> `readonly` **vendor**: `string`

#### version

> `readonly` **version**: `number`

#### validate()

> **validate**(`value`): [`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`>>>\| `Promise`\<[`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`>>>

##### Parameters

###### value

`Input`

##### Returns

[`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`\> \| `Promise`\<[`StandardSchemaResult`](../type-aliases/StandardSchemaResult.md)\<`Output`\>\>

## Methods

### parse()?

> `optional` **parse**(`value`): `Output`

Defined in: [fields/base.ts:27](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L27)

#### Parameters

##### value

`unknown`

#### Returns

`Output`

---

### safeParse()?

> `optional` **safeParse**(`value`): `unknown`

Defined in: [fields/base.ts:28](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L28)

#### Parameters

##### value

`unknown`

#### Returns

`unknown`
