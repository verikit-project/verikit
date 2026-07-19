[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / createField

# Function: createField()

> **createField**\<`TValue`, `TSchema`>>>(`fieldType`, `state?`): [`FieldBuilder`](../classes/FieldBuilder.md)\<`TValue`, `TSchema`>>>

Defined in: [fields/base.ts:342](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L342)

Creates a field builder.
Used internally by helpers such as `text()` and `select()`.

## Type Parameters

### TValue

`TValue`

### TSchema

`TSchema` _extends_ [`FieldSchema`](../interfaces/FieldSchema.md) = [`FieldSchema`](../interfaces/FieldSchema.md)

## Parameters

### fieldType

`TSchema`\[`"fieldType"`\]

### state?

`Partial`\<[`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>\> = `{}`

## Returns

[`FieldBuilder`](../classes/FieldBuilder.md)\<`TValue`, `TSchema`\>
