[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / validateResource

# Function: validateResource()

> **validateResource**(`fields`, `values`): [`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>

Defined in: validation/validate-resource.d.ts:16

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
