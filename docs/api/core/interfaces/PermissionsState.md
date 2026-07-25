[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / PermissionsState

# Interface: PermissionsState\<TActor, TRecord, TFieldName, TActionName\>

Defined in: permissions/permissions-builder.d.ts:5

Immutable state backing a `PermissionsBuilder`.

## Type Parameters

### TActor

`TActor` = `unknown`

### TRecord

`TRecord` = `unknown`

### TFieldName

`TFieldName` *extends* `string` = `string`

### TActionName

`TActionName` *extends* `string` = `string`

## Properties

### actions

> **actions**: `Record`\<`TActionName`, [`PermissionRule`](../type-aliases/PermissionRule.md)\<`TActor`, `TRecord`\>\>

Defined in: permissions/permissions-builder.d.ts:8

***

### fields

> **fields**: `Record`\<`TFieldName`, `Partial`\<`Record`\<[`FieldAccess`](../type-aliases/FieldAccess.md), [`PermissionRule`](../type-aliases/PermissionRule.md)\<`TActor`, `TRecord`\>\>\>\>

Defined in: permissions/permissions-builder.d.ts:7

***

### resource

> **resource**: `Partial`\<`Record`\<[`ResourceOperation`](../type-aliases/ResourceOperation.md), [`PermissionRule`](../type-aliases/PermissionRule.md)\<`TActor`, `TRecord`\>\>\>

Defined in: permissions/permissions-builder.d.ts:6
