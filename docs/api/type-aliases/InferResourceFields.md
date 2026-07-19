[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / InferResourceFields

# Type Alias: InferResourceFields\<TResource\>

> **InferResourceFields**\<`TResource`>= `TResource` _extends_ [`Resource`](../classes/Resource.md)\<`string`, infer TFields, `unknown`, [`RelationshipMap`](RelationshipMap.md)>? `{ [K in keyof TFields]: InferField<TFields[K]> }` : `never`

Defined in: [resource/resource.ts:130](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L130)

Extracts the plain value shape of a resource's fields (e.g. for form values).

## Type Parameters

### TResource

`TResource`
