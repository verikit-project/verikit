[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / ResourceConfig

# Interface: ResourceConfig\<TFields, TTable, TRelationships\>

Defined in: resource/resource.d.ts:86

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

Defined in: resource/resource.d.ts:88

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: resource/resource.d.ts:90

***

### relationships?

> `optional` **relationships?**: `TRelationships`

Defined in: resource/resource.d.ts:89

***

### table?

> `optional` **table?**: `TTable`

Defined in: resource/resource.d.ts:87
