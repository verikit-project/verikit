[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / InferResourceFields

# Type Alias: InferResourceFields\<TResource\>

> **InferResourceFields**\<`TResource`\> = `TResource` *extends* [`Resource`](../classes/Resource.md)\<`string`, infer TFields, `unknown`, [`RelationshipMap`](RelationshipMap.md)\> ? `{ [K in keyof TFields]: InferField<TFields[K]> }` : `never`

Defined in: resource/resource.d.ts:93

Extracts the plain value shape of a resource's fields (e.g. for form values).

## Type Parameters

### TResource

`TResource`
