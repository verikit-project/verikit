[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / ResourceConfig

# Interface: ResourceConfig\<TFields, TTable, TRelationships\>

Defined in: resource/resource.d.ts:95

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

Defined in: resource/resource.d.ts:97

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: resource/resource.d.ts:99

***

### relationships?

> `optional` **relationships?**: `TRelationships` \| ((`field`) => `TRelationships`)

Defined in: resource/resource.d.ts:98

***

### table?

> `optional` **table?**: `TTable`

Defined in: resource/resource.d.ts:96
