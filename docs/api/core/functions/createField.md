[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / createField

# Function: createField()

> **createField**\<`TValue`, `TSchema`\>(`fieldType`, `state?`): [`FieldBuilder`](../classes/FieldBuilder.md)\<`TValue`, `TSchema`\>

Defined in: fields/base.d.ts:184

Creates a field builder.
Used internally by helpers such as `text()` and `select()`.

## Type Parameters

### TValue

`TValue`

### TSchema

`TSchema` *extends* [`FieldSchema`](../interfaces/FieldSchema.md) = [`FieldSchema`](../interfaces/FieldSchema.md)

## Parameters

### fieldType

`TSchema`\[`"fieldType"`\]

### state?

`Partial`\<[`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>\>

## Returns

[`FieldBuilder`](../classes/FieldBuilder.md)\<`TValue`, `TSchema`\>
