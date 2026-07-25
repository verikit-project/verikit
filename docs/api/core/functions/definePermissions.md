[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / definePermissions

# Function: definePermissions()

> **definePermissions**\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>(`constraints?`): [`PermissionsBuilder`](../classes/PermissionsBuilder.md)\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>

Defined in: permissions/permissions-builder.d.ts:40

Creates an empty permissions builder for a resource.

## Type Parameters

### TActor

`TActor` = `unknown`

### TRecord

`TRecord` = `unknown`

### TFieldName

`TFieldName` *extends* `string` = `string`

### TActionName

`TActionName` *extends* `string` = `string`

## Parameters

### constraints?

[`PermissionNameConstraints`](../interfaces/PermissionNameConstraints.md)\<`TFieldName`, `TActionName`\>

## Returns

[`PermissionsBuilder`](../classes/PermissionsBuilder.md)\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>
