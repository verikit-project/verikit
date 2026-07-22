[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / defineResourcePermissions

# Function: defineResourcePermissions()

> **defineResourcePermissions**\<`TActor`, `TRecord`, `TResource`, `TActionName`\>(`resource`, `options?`): [`PermissionsBuilder`](../classes/PermissionsBuilder.md)\<`TActor`, `TRecord`, [`ResourcePermissionFieldNames`](../type-aliases/ResourcePermissionFieldNames.md)\<`TResource`\>, `TActionName`\>

Defined in: permissions/permissions-builder.d.ts:45

Creates a permissions builder constrained to a resource's field names, with
optional action names supplied by the caller.

## Type Parameters

### TActor

`TActor`

### TRecord

`TRecord`

### TResource

`TResource` *extends* [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>

### TActionName

`TActionName` *extends* `string` = `string`

## Parameters

### resource

`TResource`

### options?

#### actions?

readonly `TActionName`[]

## Returns

[`PermissionsBuilder`](../classes/PermissionsBuilder.md)\<`TActor`, `TRecord`, [`ResourcePermissionFieldNames`](../type-aliases/ResourcePermissionFieldNames.md)\<`TResource`\>, `TActionName`\>
