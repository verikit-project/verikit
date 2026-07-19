[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / FieldSource

# Interface: FieldSource\<TColumn\>

Defined in: fields/base.d.ts:38

Metadata for consume-mode fields that reference an existing database column.

## Type Parameters

### TColumn

`TColumn` = `unknown`

## Properties

### column

> **column**: `TColumn`

Defined in: fields/base.d.ts:45

Reference to the column being consumed

***

### mode

> **mode**: `"consume"`

Defined in: fields/base.d.ts:43

The consumption mode. Currently only "consume" is supported (derive field from column).
"generate" mode is implicit when `source` is undefined.
