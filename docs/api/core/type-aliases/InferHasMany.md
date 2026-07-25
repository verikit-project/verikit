[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / InferHasMany

# Type Alias: InferHasMany\<TRelationship\>

> **InferHasMany**\<`TRelationship`\> = `TRelationship` *extends* [`HasManyRelationshipBuilder`](../classes/HasManyRelationshipBuilder.md)\<infer TResource\> ? [`InferResource`](InferResource.md)\<`TResource`\>[] : `never`

Defined in: relationships/has-many.d.ts:36

Extracts the inferred array value type of a has-many relationship.

## Type Parameters

### TRelationship

`TRelationship`
