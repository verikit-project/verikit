[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / defineResource

# Function: defineResource()

> **defineResource**\<`TName`, `TFields`, `TTable`, `TRelationships`\>(`name`, `config`): [`Resource`](../classes/Resource.md)\<`TName`, `TFields`, `TTable`, `TRelationships`\>

Defined in: resource/define-resource.d.ts:3

Creates a `Resource` from a name and field/relationship configuration.

## Type Parameters

### TName

`TName` *extends* `string`

### TFields

`TFields` *extends* [`FieldMap`](../type-aliases/FieldMap.md)

### TTable

`TTable` = `unknown`

### TRelationships

`TRelationships` *extends* [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Parameters

### name

`TName`

### config

[`ResourceConfig`](../interfaces/ResourceConfig.md)\<`TFields`, `TTable`, `TRelationships`\>

## Returns

[`Resource`](../classes/Resource.md)\<`TName`, `TFields`, `TTable`, `TRelationships`\>
