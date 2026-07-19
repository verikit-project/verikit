[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / FieldSource

# Interface: FieldSource\<TColumn\>

Defined in: [fields/base.ts:57](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L57)

Metadata for consume-mode fields that reference an existing database column.

## Type Parameters

### TColumn

`TColumn` = `unknown`

## Properties

### column

> **column**: `TColumn`

Defined in: [fields/base.ts:64](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L64)

Reference to the column being consumed

---

### mode

> **mode**: `"consume"`

Defined in: [fields/base.ts:62](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L62)

The consumption mode. Currently only "consume" is supported (derive field from column).
"generate" mode is implicit when `source` is undefined.
