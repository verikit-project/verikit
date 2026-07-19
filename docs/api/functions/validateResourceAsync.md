[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / validateResourceAsync

# Function: validateResourceAsync()

> **validateResourceAsync**(`fields`, `values`): `Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`>>>\>\>\>

Defined in: [validation/validate-resource.ts:48](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/validation/validate-resource.ts#L48)

Async variant of `validateResource` for async field validators.

## Parameters

### fields

`Record`\<`string`, [`FieldSchema`](../interfaces/FieldSchema.md)\>

### values

`Record`\<`string`, `unknown`\>

## Returns

`Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>\>
