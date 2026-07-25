[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / hasMany

# Function: hasMany()

> **hasMany**\<`TResource`\>(`target`): [`HasManyRelationshipBuilder`](../classes/HasManyRelationshipBuilder.md)\<`TResource`\>

Defined in: relationships/has-many.d.ts:42

Creates a has-many relationship.
The target is provided as a thunk so resources can reference each other
before both are fully defined.

## Type Parameters

### TResource

`TResource` *extends* [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>

## Parameters

### target

() => `TResource`

## Returns

[`HasManyRelationshipBuilder`](../classes/HasManyRelationshipBuilder.md)\<`TResource`\>
