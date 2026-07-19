[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / belongsTo

# Function: belongsTo()

> **belongsTo**\<`TResource`>\>(`target`): [`BelongsToRelationshipBuilder`](../classes/BelongsToRelationshipBuilder.md)\<`TResource`>\>

Defined in: [relationships/belongs-to.ts:61](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L61)

Creates a belongs-to relationship.
The target is provided as a thunk so resources can reference each other
before both are fully defined.

## Type Parameters

### TResource

`TResource` _extends_ [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>

## Parameters

### target

() => `TResource`

## Returns

[`BelongsToRelationshipBuilder`](../classes/BelongsToRelationshipBuilder.md)\<`TResource`\>
