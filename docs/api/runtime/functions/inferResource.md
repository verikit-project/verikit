[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / inferResource

# Function: inferResource()

> **inferResource**(`fields`, `values`): `ValidationResult`\<`Record`\<`string`, `unknown`\>\>

Defined in: infer/infer-resource.d.ts:6

Infers typed values for a resource from raw input using each field's schema.
Optional fields omitted from the input are skipped unless they have defaults.

## Parameters

### fields

`Record`\<`string`, `FieldSchema`\>

### values

`Record`\<`string`, `unknown`\>

## Returns

`ValidationResult`\<`Record`\<`string`, `unknown`\>\>
