[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / validateResource

# Function: validateResource()

> **validateResource**(`fields`, `values`): [`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>

Defined in: [validation/validate-resource.ts:35](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/validation/validate-resource.ts#L35)

Validates values against a resource's field schemas.
Relationships are intentionally excluded because they describe schema
structure rather than value payloads.

## Parameters

### fields

`Record`\<`string`, [`FieldSchema`](../interfaces/FieldSchema.md)\>

### values

`Record`\<`string`, `unknown`\>

## Returns

[`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>
