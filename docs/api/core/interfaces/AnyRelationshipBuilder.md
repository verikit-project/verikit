[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / AnyRelationshipBuilder

# Interface: AnyRelationshipBuilder

Defined in: resource/resource.d.ts:22

Structural shape shared by belongsTo/hasMany/belongsToMany, whose concrete
builders/objects have no common base class — only `toSchema` is uniform.

## Methods

### toSchema()

> **toSchema**(`name?`): [`RelationshipSchema`](../type-aliases/RelationshipSchema.md)

Defined in: resource/resource.d.ts:23

#### Parameters

##### name?

`string`

#### Returns

[`RelationshipSchema`](../type-aliases/RelationshipSchema.md)
