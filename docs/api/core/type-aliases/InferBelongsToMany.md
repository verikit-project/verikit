[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / InferBelongsToMany

# Type Alias: InferBelongsToMany\<TRelationship\>

> **InferBelongsToMany**\<`TRelationship`\> = `TRelationship` *extends* [`BelongsToManyRelationshipBuilder`](../classes/BelongsToManyRelationshipBuilder.md)\<infer TResource\> ? [`InferResource`](InferResource.md)\<`TResource`\>[] : `never`

Defined in: relationships/belongs-to-many.d.ts:44

Extracts the inferred array value type of a belongs-to-many relationship.

## Type Parameters

### TRelationship

`TRelationship`
