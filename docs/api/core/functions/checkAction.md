[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / checkAction

# Function: checkAction()

> **checkAction**\<`TActor`, `TRecord`\>(`permissions`, `action`, `context`): `Promise`\<[`PermissionCheckResult`](../interfaces/PermissionCheckResult.md)\>

Defined in: permissions/evaluate-permissions.d.ts:29

Checks whether the actor in `context` may run a named runtime action.
Resolves to `{ allowed: false }` if no rule was attached via `.action()`
for that action name.

## Type Parameters

### TActor

`TActor`

### TRecord

`TRecord`

## Parameters

### permissions

[`PermissionRuntimeSource`](../type-aliases/PermissionRuntimeSource.md)\<`TActor`, `TRecord`\>

### action

`string`

### context

[`PermissionContext`](../interfaces/PermissionContext.md)\<`TActor`, `TRecord`\>

## Returns

`Promise`\<[`PermissionCheckResult`](../interfaces/PermissionCheckResult.md)\>
