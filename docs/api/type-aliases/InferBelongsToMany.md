[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / InferBelongsToMany

# Type Alias: InferBelongsToMany\<TRelationship\>

> **InferBelongsToMany**\<`TRelationship`\> = `TRelationship` *extends* [`BelongsToManyRelationshipBuilder`](../classes/BelongsToManyRelationshipBuilder.md)\<infer TResource\> ? [`InferResource`](InferResource.md)\<`TResource`\>[] : `never`

Defined in: [relationships/belongs-to-many.ts:78](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to-many.ts#L78)

Extracts the inferred array value type of a belongs-to-many relationship.

## Type Parameters

### TRelationship

`TRelationship`
