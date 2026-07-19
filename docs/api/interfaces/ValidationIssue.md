[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / ValidationIssue

# Interface: ValidationIssue

Defined in: [types/validation.ts:6](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/types/validation.ts#L6)

A single validation failure, scoped to a path relative to the value being
validated. `validateField` always reports an empty path; `validateResource`
prefixes each field's issues with that field's name.

## Properties

### message

> **message**: `string`

Defined in: [types/validation.ts:8](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/types/validation.ts#L8)

***

### path

> **path**: readonly (`string` \| `number`)[]

Defined in: [types/validation.ts:7](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/types/validation.ts#L7)
