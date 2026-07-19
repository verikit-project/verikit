[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / defineResource

# Function: defineResource()

> **defineResource**\<`TName`, `TFields`, `TTable`, `TRelationships`>>>\>(`name`, `config`): [`Resource`](../classes/Resource.md)\<`TName`, `TFields`, `TTable`, `TRelationships`>>>\>

Defined in: [resource/define-resource.ts:9](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/define-resource.ts#L9)

Creates a `Resource` from a name and field/relationship configuration.

## Type Parameters

### TName

`TName` _extends_ `string`

### TFields

`TFields` _extends_ [`FieldMap`](../type-aliases/FieldMap.md)

### TTable

`TTable` = `unknown`

### TRelationships

`TRelationships` _extends_ [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Parameters

### name

`TName`

### config

[`ResourceConfig`](../interfaces/ResourceConfig.md)\<`TFields`, `TTable`, `TRelationships`\>

## Returns

[`Resource`](../classes/Resource.md)\<`TName`, `TFields`, `TTable`, `TRelationships`\>
