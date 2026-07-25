[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / aggregateFieldResults

# Function: aggregateFieldResults()

> **aggregateFieldResults**(`entries`): [`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>

Defined in: validation/validate-resource.d.ts:9

Merges per-field results (from `validateField`, `validateFieldAsync`, or
any other function returning the same shape, e.g. `@verikit/runtime`'s
`inferField`) into a single resource-level result, prefixing each field's
issue paths with its name.

## Parameters

### entries

readonly \[`string`, [`ValidationResult`](../type-aliases/ValidationResult.md)\][]

## Returns

[`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>
