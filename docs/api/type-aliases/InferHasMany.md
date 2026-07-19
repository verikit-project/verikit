[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / InferHasMany

# Type Alias: InferHasMany\<TRelationship\>

> **InferHasMany**\<`TRelationship`> > > \> = `TRelationship` _extends_ [`HasManyRelationshipBuilder`](../classes/HasManyRelationshipBuilder.md)\<infer TResource\> ? [`InferResource`](InferResource.md)\<`TResource`>>>\>[] : `never`

Defined in: [relationships/has-many.ts:59](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L59)

Extracts the inferred array value type of a has-many relationship.

## Type Parameters

### TRelationship

`TRelationship`
