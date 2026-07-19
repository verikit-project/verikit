[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / ResourceSchema

# Interface: ResourceSchema\<TName, TFields, TRelationships\>

Defined in: resource/resource.d.ts:73

Serializable resource schema produced by `Resource.toSchema()`.

## Type Parameters

### TName

`TName` *extends* `string` = `string`

### TFields

`TFields` *extends* [`FieldMap`](../type-aliases/FieldMap.md) = [`FieldMap`](../type-aliases/FieldMap.md)

### TRelationships

`TRelationships` *extends* [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Properties

### fields

> **fields**: `{ [K in string]: ReturnType<TFields[K]["toSchema"]> }`

Defined in: resource/resource.d.ts:76

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: resource/resource.d.ts:83

***

### name

> **name**: `TName`

Defined in: resource/resource.d.ts:75

***

### relationships

> **relationships**: `{ [K in string]: ReturnType<TRelationships[K]["toSchema"]> }`

Defined in: resource/resource.d.ts:79

***

### tree

> **tree**: [`SchemaNode`](../type-aliases/SchemaNode.md)[]

Defined in: resource/resource.d.ts:82

***

### type

> **type**: `"resource"`

Defined in: resource/resource.d.ts:74
