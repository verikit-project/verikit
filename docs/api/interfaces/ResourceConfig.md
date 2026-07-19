[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / ResourceConfig

# Interface: ResourceConfig\<TFields, TTable, TRelationships\>

Defined in: [resource/resource.ts:118](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L118)

Configuration passed to `defineResource()`.

## Type Parameters

### TFields

`TFields` *extends* [`FieldMap`](../type-aliases/FieldMap.md) = [`FieldMap`](../type-aliases/FieldMap.md)

### TTable

`TTable` = `unknown`

### TRelationships

`TRelationships` *extends* [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Properties

### fields

> **fields**: `TFields`

Defined in: [resource/resource.ts:124](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L124)

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: [resource/resource.ts:126](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L126)

***

### relationships?

> `optional` **relationships?**: `TRelationships`

Defined in: [resource/resource.ts:125](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L125)

***

### table?

> `optional` **table?**: `TTable`

Defined in: [resource/resource.ts:123](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L123)
