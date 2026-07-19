[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / Resource

# Class: Resource\<TName, TFields, TTable, TRelationships\>

Defined in: resource/resource.d.ts:108

Immutable resource definition.
Finalize with `.toSchema()` to produce a serializable resource schema.

## Type Parameters

### TName

`TName` *extends* `string` = `string`

### TFields

`TFields` *extends* [`FieldMap`](../type-aliases/FieldMap.md) = [`FieldMap`](../type-aliases/FieldMap.md)

### TTable

`TTable` = `unknown`

### TRelationships

`TRelationships` *extends* [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Constructors

### Constructor

> **new Resource**\<`TName`, `TFields`, `TTable`, `TRelationships`\>(`name`, `config`): `Resource`\<`TName`, `TFields`, `TTable`, `TRelationships`\>

Defined in: resource/resource.d.ts:116

#### Parameters

##### name

`TName`

##### config

[`ResourceConfig`](../interfaces/ResourceConfig.md)\<`TFields`, `TTable`, `TRelationships`\>

#### Returns

`Resource`\<`TName`, `TFields`, `TTable`, `TRelationships`\>

#### Throws

If a field and relationship share the same name.

## Properties

### fields

> `readonly` **fields**: `TFields`

Defined in: resource/resource.d.ts:111

***

### meta?

> `readonly` `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: resource/resource.d.ts:113

***

### name

> `readonly` **name**: `TName`

Defined in: resource/resource.d.ts:109

***

### relationships

> `readonly` **relationships**: `TRelationships`

Defined in: resource/resource.d.ts:112

***

### table?

> `readonly` `optional` **table?**: `TTable`

Defined in: resource/resource.d.ts:110

## Methods

### form()

> **form**(`factory`): `this`

Defined in: resource/resource.d.ts:118

Attaches a form layout factory; returns `this` for chaining.

#### Parameters

##### factory

(`builder`) => [`SchemaNode`](../type-aliases/SchemaNode.md)[]

#### Returns

`this`

***

### toSchema()

> **toSchema**(): [`ResourceSchema`](../interfaces/ResourceSchema.md)\<`TName`, `TFields`, `TRelationships`\>

Defined in: resource/resource.d.ts:124

Finalizes fields and relationships into schemas and builds the layout
tree (via the form factory if `.form()` was called, otherwise a flat
list of fields in declaration order).

#### Returns

[`ResourceSchema`](../interfaces/ResourceSchema.md)\<`TName`, `TFields`, `TRelationships`\>
