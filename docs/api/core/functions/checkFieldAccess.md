[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / checkFieldAccess

# Function: checkFieldAccess()

> **checkFieldAccess**\<`TActor`, `TRecord`\>(`permissions`, `field`, `access`, `context`): `Promise`\<[`PermissionCheckResult`](../interfaces/PermissionCheckResult.md)\>

Defined in: permissions/evaluate-permissions.d.ts:23

Checks whether the actor in `context` has read or write access to a named
field. Resolves to `{ allowed: false }` if no rule was attached via
`.field()` for that field/access combination.

Read and write are independent: a `.field(name, { read })` call leaves
write access denied until its own rule is set (and vice versa).

## Type Parameters

### TActor

`TActor`

### TRecord

`TRecord`

## Parameters

### permissions

[`PermissionRuntimeSource`](../type-aliases/PermissionRuntimeSource.md)\<`TActor`, `TRecord`\>

### field

`string`

### access

[`FieldAccess`](../type-aliases/FieldAccess.md)

### context

[`PermissionContext`](../interfaces/PermissionContext.md)\<`TActor`, `TRecord`\>

## Returns

`Promise`\<[`PermissionCheckResult`](../interfaces/PermissionCheckResult.md)\>
