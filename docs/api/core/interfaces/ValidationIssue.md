[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / ValidationIssue

# Interface: ValidationIssue

Defined in: types/validation.d.ts:6

A single validation failure, scoped to a path relative to the value being
validated. `validateField` always reports an empty path; `validateResource`
prefixes each field's issues with that field's name.

## Properties

### message

> **message**: `string`

Defined in: types/validation.d.ts:8

***

### path

> **path**: readonly (`string` \| `number`)[]

Defined in: types/validation.d.ts:7
