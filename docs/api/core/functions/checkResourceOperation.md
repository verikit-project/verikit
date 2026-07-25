[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / checkResourceOperation

# Function: checkResourceOperation()

> **checkResourceOperation**\<`TActor`, `TRecord`\>(`permissions`, `operation`, `context`): `Promise`\<[`PermissionCheckResult`](../interfaces/PermissionCheckResult.md)\>

Defined in: permissions/evaluate-permissions.d.ts:14

Checks whether the actor in `context` may perform a resource-level CRUD
operation. Resolves to `{ allowed: false }` if no rule was attached via
`.can()` for that operation.

## Type Parameters

### TActor

`TActor`

### TRecord

`TRecord`

## Parameters

### permissions

[`PermissionRuntimeSource`](../type-aliases/PermissionRuntimeSource.md)\<`TActor`, `TRecord`\>

### operation

[`ResourceOperation`](../type-aliases/ResourceOperation.md)

### context

[`PermissionContext`](../interfaces/PermissionContext.md)\<`TActor`, `TRecord`\>

## Returns

`Promise`\<[`PermissionCheckResult`](../interfaces/PermissionCheckResult.md)\>
