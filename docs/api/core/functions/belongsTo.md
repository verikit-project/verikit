[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / belongsTo

# Function: belongsTo()

> **belongsTo**\<`TResource`\>(`target`): [`BelongsToRelationshipBuilder`](../classes/BelongsToRelationshipBuilder.md)\<`TResource`\>

Defined in: relationships/belongs-to.d.ts:39

Creates a belongs-to relationship.
The target is provided as a thunk so resources can reference each other
before both are fully defined.

## Type Parameters

### TResource

`TResource` *extends* [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>

## Parameters

### target

() => `TResource`

## Returns

[`BelongsToRelationshipBuilder`](../classes/BelongsToRelationshipBuilder.md)\<`TResource`\>
