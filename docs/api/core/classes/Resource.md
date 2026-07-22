[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / Resource

# Class: Resource\<TName, TFields, TTable, TRelationships\>

Defined in: resource/resource.d.ts:117

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

> **new Resource**\<`TName`, `TFields`, `TTable`, `TRelationships`\>(`name`, `config`, `formFactory?`): `Resource`\<`TName`, `TFields`, `TTable`, `TRelationships`\>

Defined in: resource/resource.d.ts:128

#### Parameters

##### name

`TName`

##### config

[`ResourceConfig`](../interfaces/ResourceConfig.md)\<`TFields`, `TTable`, `TRelationships`\>

##### formFactory?

(`builder`) => [`SchemaNode`](../type-aliases/SchemaNode.md)[]

#### Returns

`Resource`\<`TName`, `TFields`, `TTable`, `TRelationships`\>

#### Throws

If the resource name is empty, or if a field and
relationship share the same name.

## Properties

### fields

> `readonly` **fields**: `TFields`

Defined in: resource/resource.d.ts:120

***

### meta?

> `readonly` `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: resource/resource.d.ts:122

***

### name

> `readonly` **name**: `TName`

Defined in: resource/resource.d.ts:118

***

### relationships

> `readonly` **relationships**: `TRelationships`

Defined in: resource/resource.d.ts:121

***

### table?

> `readonly` `optional` **table?**: `TTable`

Defined in: resource/resource.d.ts:119

## Methods

### field()

> **field**\<`TName`\>(`name`): [`FieldReference`](../type-aliases/FieldReference.md)\<`TName`\>

Defined in: resource/resource.d.ts:130

Returns a compile-time checked reference to one of this resource's fields.

#### Type Parameters

##### TName

`TName` *extends* `string`

#### Parameters

##### name

`TName`

#### Returns

[`FieldReference`](../type-aliases/FieldReference.md)\<`TName`\>

***

### form()

> **form**(`factory`): `this`

Defined in: resource/resource.d.ts:132

Attaches a form layout factory, returning a new resource instance.

#### Parameters

##### factory

(`builder`) => [`SchemaNode`](../type-aliases/SchemaNode.md)[]

#### Returns

`this`

***

### toSchema()

> **toSchema**(): [`ResourceSchema`](../interfaces/ResourceSchema.md)\<`TName`, `TFields`, `TRelationships`\>

Defined in: resource/resource.d.ts:138

Finalizes fields and relationships into schemas and builds the layout
tree (via the form factory if `.form()` was called, otherwise a flat
list of fields in declaration order).

#### Returns

[`ResourceSchema`](../interfaces/ResourceSchema.md)\<`TName`, `TFields`, `TRelationships`\>
