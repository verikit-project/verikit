[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / validateWritableFields

# Function: validateWritableFields()

> **validateWritableFields**\<`TActor`, `TRecord`\>(`fields`, `values`, `permissions`, `context`): `Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>\>

Defined in: permissions/validate-writable-fields.d.ts:16

Validates values against a resource's field schemas the same way
`validateResourceAsync` does, but first checks write access for each
field via `checkFieldAccess`.

A field the actor cannot write to is reported as a single validation issue
(using the denying rule's `reason` if it provided one) instead of being
run through its normal constraint and attached-validator checks — being
unwritable takes precedence over whether the given value would otherwise
be valid.

## Type Parameters

### TActor

`TActor`

### TRecord

`TRecord`

## Parameters

### fields

`Record`\<`string`, [`FieldSchema`](../interfaces/FieldSchema.md)\>

### values

`Record`\<`string`, `unknown`\>

### permissions

[`PermissionsBuilder`](../classes/PermissionsBuilder.md)\<`TActor`, `TRecord`\>

### context

[`PermissionContext`](../interfaces/PermissionContext.md)\<`TActor`, `TRecord`\>

## Returns

`Promise`\<[`ValidationResult`](../type-aliases/ValidationResult.md)\<`Record`\<`string`, `unknown`\>\>\>
