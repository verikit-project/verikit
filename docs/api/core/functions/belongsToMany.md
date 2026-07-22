[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / belongsToMany

# Function: belongsToMany()

> **belongsToMany**\<`TResource`\>(`target`): [`BelongsToManyRelationshipBuilder`](../classes/BelongsToManyRelationshipBuilder.md)\<`TResource`\>

Defined in: relationships/belongs-to-many.d.ts:50

Creates a many-to-many relationship.
The target is provided as a thunk so resources can reference each other
before both are fully defined.

## Type Parameters

### TResource

`TResource` *extends* [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>

## Parameters

### target

() => `TResource`

## Returns

[`BelongsToManyRelationshipBuilder`](../classes/BelongsToManyRelationshipBuilder.md)\<`TResource`\>
