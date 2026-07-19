[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / FieldBuilderState

# Type Alias: FieldBuilderState\<TSchema\>

> **FieldBuilderState**\<`TSchema`> \> = `Omit`\<`TSchema`, `"type"` \| `"name"`>\>

Defined in: [fields/base.ts:127](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L127)

Internal type representing the mutable state of a FieldBuilder.
Excludes "type" and "name" since those are set only at finalization.

## Type Parameters

### TSchema

`TSchema` _extends_ [`FieldSchema`](../interfaces/FieldSchema.md) = [`FieldSchema`](../interfaces/FieldSchema.md)
