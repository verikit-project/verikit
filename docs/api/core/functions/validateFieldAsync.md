[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / validateFieldAsync

# Function: validateFieldAsync()

> **validateFieldAsync**(`schema`, `value`): `Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)\>

Defined in: validation/validate-field.d.ts:14

Async counterpart to `validateField`, for `.validation()` validators whose
`parse` or `~standard.validate` resolves via a Promise.

## Parameters

### schema

[`FieldSchema`](../interfaces/FieldSchema.md)

### value

`unknown`

## Returns

`Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)\>
