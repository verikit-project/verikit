[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / BelongsToManyRelationshipBuilder

# Class: BelongsToManyRelationshipBuilder\<TResource\>

Defined in: relationships/belongs-to-many.d.ts:35

Fluent builder for many-to-many relationships resolved through a
join/through resource.

## Extends

- `RelationshipBuilder`\<`TResource`, `BelongsToManyRelationshipBuilderState`\>

## Type Parameters

### TResource

`TResource` *extends* [`Resource`](Resource.md) = [`Resource`](Resource.md)

## Constructors

### Constructor

> **new BelongsToManyRelationshipBuilder**\<`TResource`\>(`target`, `state?`): `BelongsToManyRelationshipBuilder`\<`TResource`\>

Defined in: relationships/belongs-to-many.d.ts:37

#### Parameters

##### target

() => `TResource`

##### state?

`BelongsToManyRelationshipBuilderState`

#### Returns

`BelongsToManyRelationshipBuilder`\<`TResource`\>

#### Overrides

`RelationshipBuilder<TResource, BelongsToManyRelationshipBuilderState>.constructor`

## Properties

### kind

> `readonly` **kind**: `"belongsToMany"` = `"belongsToMany"`

Defined in: relationships/belongs-to-many.d.ts:36

***

### state

> `protected` `readonly` **state**: `BelongsToManyRelationshipBuilderState`

Defined in: relationships/shared/relationship-builder.d.ts:15

#### Inherited from

`RelationshipBuilder.state`

***

### target

> `readonly` **target**: () => `TResource`

Defined in: relationships/shared/relationship-builder.d.ts:14

#### Returns

`TResource`

#### Inherited from

`RelationshipBuilder.target`

## Methods

### displayField()

> **displayField**(`field`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:31

Sets the field displayed for related records.

#### Parameters

##### field

keyof [`InferResourceFields`](../type-aliases/InferResourceFields.md)\<`TResource`\> & `string`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.displayField`

***

### inverse()

> **inverse**(`field`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:27

Sets the inverse relationship on the target resource.

#### Parameters

##### field

`string`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.inverse`

***

### label()

> **label**(`label`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:25

Sets a human-readable label for the relationship.

#### Parameters

##### label

`string`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.label`

***

### resourceName()

> **resourceName**(): `string`

Defined in: relationships/shared/relationship-builder.d.ts:23

Returns the name of the target resource.

#### Returns

`string`

#### Inherited from

`RelationshipBuilder.resourceName`

***

### through()

> **through**(`resourceName`): `this`

Defined in: relationships/belongs-to-many.d.ts:39

Sets the join/through resource name linking the two sides.

#### Parameters

##### resourceName

`string`

#### Returns

`this`

***

### toSchema()

> **toSchema**(`name?`): [`BelongsToManyRelationshipSchema`](../interfaces/BelongsToManyRelationshipSchema.md)

Defined in: relationships/belongs-to-many.d.ts:41

Finalizes the builder into a `BelongsToManyRelationshipSchema`.

#### Parameters

##### name?

`string`

#### Returns

[`BelongsToManyRelationshipSchema`](../interfaces/BelongsToManyRelationshipSchema.md)

***

### via()

> **via**(`foreignKey`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:29

Sets the foreign key column used to look up matching rows.

#### Parameters

##### foreignKey

`unknown`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.via`

***

### withState()

> `protected` **withState**(`patch`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:21

Creates a new instance of the current concrete builder (via
`this.constructor`) so subclass setters stay available after chaining.

#### Parameters

##### patch

`Partial`\<`TState`\>

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.withState`
