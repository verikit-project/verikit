[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / FieldBuilderWithValue

# Type Alias: FieldBuilderWithValue\<TBuilder, TValue, TSchema\>

> **FieldBuilderWithValue**\<`TBuilder`, `TValue`, `TSchema`\> = `Omit`\<`TBuilder`, `"$value"`\> & [`FieldBuilder`](../classes/FieldBuilder.md)\<`TValue`, `TSchema`\>

Defined in: fields/base.d.ts:103

Preserves the current concrete builder shape while replacing its inferred
value type. This keeps subclass methods available after base modifiers like
`.label()`, `.required()`, or `.nullable()`.

## Type Parameters

### TBuilder

`TBuilder`

### TValue

`TValue`

### TSchema

`TSchema` *extends* [`FieldSchema`](../interfaces/FieldSchema.md)
