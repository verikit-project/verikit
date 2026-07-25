[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / InferResource

# Type Alias: InferResource\<TResource\>

> **InferResource**\<`TResource`\> = `TResource` *extends* [`Resource`](../classes/Resource.md)\<`string`, infer TFields, `unknown`, infer TRelationships\> ? [`InferResourceFields`](InferResourceFields.md)\<[`Resource`](../classes/Resource.md)\<`string`, `TFields`, `unknown`, `TRelationships`\>\> & `InferResourceRelationships`\<`TRelationships`\> : `never`

Defined in: resource/resource.d.ts:112

Infers the plain runtime shape of a resource: its fields merged with its relationship values.

## Type Parameters

### TResource

`TResource`
