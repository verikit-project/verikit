[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / ResourceSchema

# Interface: ResourceSchema\<TName, TFields, TRelationships\>

Defined in: [resource/resource.ts:98](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L98)

Serializable resource schema produced by `Resource.toSchema()`.

## Type Parameters

### TName

`TName` _extends_ `string` = `string`

### TFields

`TFields` _extends_ [`FieldMap`](../type-aliases/FieldMap.md) = [`FieldMap`](../type-aliases/FieldMap.md)

### TRelationships

`TRelationships` _extends_ [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Properties

### fields

> **fields**: `{ [K in string]: ReturnType<TFields[K]["toSchema"]> }`

Defined in: [resource/resource.ts:105](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L105)

---

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`>\>

Defined in: [resource/resource.ts:114](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L114)

---

### name

> **name**: `TName`

Defined in: [resource/resource.ts:104](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L104)

---

### relationships

> **relationships**: `{ [K in string]: ReturnType<TRelationships[K]["toSchema"]> }`

Defined in: [resource/resource.ts:108](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L108)

---

### tree

> **tree**: [`SchemaNode`](../type-aliases/SchemaNode.md)[]

Defined in: [resource/resource.ts:113](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L113)

---

### type

> **type**: `"resource"`

Defined in: [resource/resource.ts:103](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L103)
