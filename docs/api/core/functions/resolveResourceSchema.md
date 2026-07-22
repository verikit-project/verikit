[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / resolveResourceSchema

# Function: resolveResourceSchema()

> **resolveResourceSchema**\<`TActor`, `TRecord`\>(`schema`, `permissions`, `context`): `Promise`\<[`ResourceSchema`](../interfaces/ResourceSchema.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>\>

Defined in: permissions/resource-schema.d.ts:15

Resolves a resource schema for a specific actor: fields the actor cannot
read are marked `hidden`, and fields the actor cannot write are marked
`readOnly`, layered on top of whatever those flags were already set to.
Layout tree nodes referencing those fields are updated to match, so
adapters can render directly from either `fields` or `tree` and see the
same access decisions.

Does not mutate the input schema. Relationships are left untouched —
`PermissionsBuilder` only gates named fields and actions.

## Type Parameters

### TActor

`TActor`

### TRecord

`TRecord`

## Parameters

### schema

[`ResourceSchema`](../interfaces/ResourceSchema.md)

### permissions

[`PermissionsBuilder`](../classes/PermissionsBuilder.md)\<`TActor`, `TRecord`\>

### context

[`PermissionContext`](../interfaces/PermissionContext.md)\<`TActor`, `TRecord`\>

## Returns

`Promise`\<[`ResourceSchema`](../interfaces/ResourceSchema.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>\>
