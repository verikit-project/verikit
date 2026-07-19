[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / InferResource

# Type Alias: InferResource\<TResource\>

> **InferResource**\<`TResource`> \> = `TResource` _extends_ [`Resource`](../classes/Resource.md)\<`string`, infer TFields, `unknown`, infer TRelationships\> ? [`InferResourceFields`](InferResourceFields.md)\<[`Resource`](../classes/Resource.md)\<`string`, `TFields`, `unknown`, `TRelationships`>> \>\> & `InferResourceRelationships`\<`TRelationships`> \> : `never`

Defined in: [resource/resource.ts:156](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L156)

Infers the plain runtime shape of a resource: its fields merged with its relationship values.

## Type Parameters

### TResource

`TResource`
