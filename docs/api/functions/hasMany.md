[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / hasMany

# Function: hasMany()

> **hasMany**\<`TResource`>>>\>(`target`): [`HasManyRelationshipBuilder`](../classes/HasManyRelationshipBuilder.md)\<`TResource`>>>\>

Defined in: [relationships/has-many.ts:69](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L69)

Creates a has-many relationship.
The target is provided as a thunk so resources can reference each other
before both are fully defined.

## Type Parameters

### TResource

`TResource` _extends_ [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>

## Parameters

### target

() => `TResource`

## Returns

[`HasManyRelationshipBuilder`](../classes/HasManyRelationshipBuilder.md)\<`TResource`\>
