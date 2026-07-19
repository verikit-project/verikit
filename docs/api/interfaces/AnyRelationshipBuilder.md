[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / AnyRelationshipBuilder

# Interface: AnyRelationshipBuilder

Defined in: [resource/resource.ts:30](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L30)

Structural shape shared by belongsTo/hasMany/belongsToMany, whose concrete
builders/objects have no common base class — only `toSchema` is uniform.

## Methods

### toSchema()

> **toSchema**(`name?`): [`RelationshipSchema`](../type-aliases/RelationshipSchema.md)

Defined in: [resource/resource.ts:31](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L31)

#### Parameters

##### name?

`string`

#### Returns

[`RelationshipSchema`](../type-aliases/RelationshipSchema.md)
