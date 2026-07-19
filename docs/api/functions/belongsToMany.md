[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / belongsToMany

# Function: belongsToMany()

> **belongsToMany**\<`TResource`>>>(`target`): [`BelongsToManyRelationshipBuilder`](../classes/BelongsToManyRelationshipBuilder.md)\<`TResource`>>>

Defined in: [relationships/belongs-to-many.ts:88](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to-many.ts#L88)

Creates a many-to-many relationship.
The target is provided as a thunk so resources can reference each other
before both are fully defined.

## Type Parameters

### TResource

`TResource` _extends_ [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>

## Parameters

### target

() => `TResource`

## Returns

[`BelongsToManyRelationshipBuilder`](../classes/BelongsToManyRelationshipBuilder.md)\<`TResource`\>
