[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / FieldBuilderState

# Type Alias: FieldBuilderState\<TSchema\>

> **FieldBuilderState**\<`TSchema`\> = `Omit`\<`TSchema`, `"type"` \| `"name"`\>

Defined in: fields/base.d.ts:97

Internal type representing the mutable state of a FieldBuilder.
Excludes "type" and "name" since those are set only at finalization.

## Type Parameters

### TSchema

`TSchema` *extends* [`FieldSchema`](../interfaces/FieldSchema.md) = [`FieldSchema`](../interfaces/FieldSchema.md)
