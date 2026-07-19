[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / Resource

# Class: Resource\<TName, TFields, TTable, TRelationships\>

Defined in: [resource/resource.ts:171](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L171)

Immutable resource definition.
Finalize with `.toSchema()` to produce a serializable resource schema.

## Type Parameters

### TName

`TName` _extends_ `string` = `string`

### TFields

`TFields` _extends_ [`FieldMap`](../type-aliases/FieldMap.md) = [`FieldMap`](../type-aliases/FieldMap.md)

### TTable

`TTable` = `unknown`

### TRelationships

`TRelationships` _extends_ [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Constructors

### Constructor

> **new Resource**\<`TName`, `TFields`, `TTable`, `TRelationships`>(`name`, `config`): `Resource`\<`TName`, `TFields`, `TTable`, `TRelationships`>

Defined in: [resource/resource.ts:193](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L193)

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

Defined in: [resource/resource.ts:179](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L179)

---

### meta?

> `readonly` `optional` **meta?**: `Record`\<`string`, `unknown`>

Defined in: [resource/resource.ts:181](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L181)

---

### name

> `readonly` **name**: `TName`

Defined in: [resource/resource.ts:177](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L177)

---

### relationships

> `readonly` **relationships**: `TRelationships`

Defined in: [resource/resource.ts:180](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L180)

---

### table?

> `readonly` `optional` **table?**: `TTable`

Defined in: [resource/resource.ts:178](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L178)

## Methods

### form()

> **form**(`factory`): `this`

Defined in: [resource/resource.ts:216](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L216)

Attaches a form layout factory; returns `this` for chaining.

#### Parameters

##### factory

(`builder`) => [`SchemaNode`](../type-aliases/SchemaNode.md)[]

#### Returns

`this`

---

### toSchema()

> **toSchema**(): [`ResourceSchema`](../interfaces/ResourceSchema.md)\<`TName`, `TFields`, `TRelationships`>

Defined in: [resource/resource.ts:230](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L230)

Finalizes fields and relationships into schemas and builds the layout
tree (via the form factory if `.form()` was called, otherwise a flat
list of fields in declaration order).

#### Returns

[`ResourceSchema`](../interfaces/ResourceSchema.md)\<`TName`, `TFields`, `TRelationships`\>
