[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / validateFieldAsync

# Function: validateFieldAsync()

> **validateFieldAsync**(`schema`, `value`): `Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)>>>

Defined in: [validation/validate-field.ts:341](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/validation/validate-field.ts#L341)

Async counterpart to `validateField`, for `.validation()` validators whose
`parse` or `~standard.validate` resolves via a Promise.

## Parameters

### schema

[`FieldSchema`](../interfaces/FieldSchema.md)

### value

`unknown`

## Returns

`Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)\>
