[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / FieldReference

# Type Alias: FieldReference\<TName\>

> **FieldReference**\<`TName`\> = `TName` & `object`

Defined in: resource/resource.d.ts:32

Branded string reference to a resource field. It serializes as the field
name, while preserving compile-time checks at `.via(...)` call sites.

## Type Declaration

### \[fieldReferenceBrand\]

> `readonly` **\[fieldReferenceBrand\]**: `"field"`

## Type Parameters

### TName

`TName` *extends* `string` = `string`
