[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / PermissionRule

# Type Alias: PermissionRule\<TActor, TRecord\>

> **PermissionRule**\<`TActor`, `TRecord`\> = (`context`) => [`PermissionResult`](PermissionResult.md) \| `Promise`\<[`PermissionResult`](PermissionResult.md)\>

Defined in: permissions/permission.d.ts:16

A predicate that decides whether an actor may perform an operation.

## Type Parameters

### TActor

`TActor` = `unknown`

### TRecord

`TRecord` = `unknown`

## Parameters

### context

[`PermissionContext`](../interfaces/PermissionContext.md)\<`TActor`, `TRecord`\>

## Returns

[`PermissionResult`](PermissionResult.md) \| `Promise`\<[`PermissionResult`](PermissionResult.md)\>
