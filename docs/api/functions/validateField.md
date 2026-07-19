[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / validateField

# Function: validateField()

> **validateField**(`schema`, `value`): [`ValidationResult`](../type-aliases/ValidationResult.md)

Defined in: [validation/validate-field.ts:306](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/validation/validate-field.ts#L306)

Validates a value against a finalized `FieldSchema`: built-in constraint
checks first, then any attached `.validation()` validator. Reports an
issue if that validator resolves asynchronously; use `validateFieldAsync`.

## Parameters

### schema

[`FieldSchema`](../interfaces/FieldSchema.md)

### value

`unknown`

## Returns

[`ValidationResult`](../type-aliases/ValidationResult.md)
