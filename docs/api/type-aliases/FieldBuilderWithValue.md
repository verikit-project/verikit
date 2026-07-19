[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / FieldBuilderWithValue

# Type Alias: FieldBuilderWithValue\<TBuilder, TValue, TSchema\>

> **FieldBuilderWithValue**\<`TBuilder`, `TValue`, `TSchema`>= `Omit`\<`TBuilder`, `"$value"`>& [`FieldBuilder`](../classes/FieldBuilder.md)\<`TValue`, `TSchema`>

Defined in: [fields/base.ts:137](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L137)

Preserves the current concrete builder shape while replacing its inferred
value type. This keeps subclass methods available after base modifiers like
`.label()`, `.required()`, or `.nullable()`.

## Type Parameters

### TBuilder

`TBuilder`

### TValue

`TValue`

### TSchema

`TSchema` _extends_ [`FieldSchema`](../interfaces/FieldSchema.md)
