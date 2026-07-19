[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / HasManyRelationshipBuilder

# Class: HasManyRelationshipBuilder\<TResource\>

Defined in: relationships/has-many.d.ts:29

Fluent builder for has-many relationships.
The target resource stores the foreign key to this resource.

## Extends

- `RelationshipBuilder`\<`TResource`, `RelationshipBuilderState`\>

## Type Parameters

### TResource

`TResource` *extends* [`Resource`](Resource.md) = [`Resource`](Resource.md)

## Constructors

### Constructor

> **new HasManyRelationshipBuilder**\<`TResource`\>(`target`, `state?`): `HasManyRelationshipBuilder`\<`TResource`\>

Defined in: relationships/has-many.d.ts:31

#### Parameters

##### target

() => `TResource`

##### state?

`RelationshipBuilderState`

#### Returns

`HasManyRelationshipBuilder`\<`TResource`\>

#### Overrides

`RelationshipBuilder<TResource, RelationshipBuilderState>.constructor`

## Properties

### kind

> `readonly` **kind**: `"hasMany"` = `"hasMany"`

Defined in: relationships/has-many.d.ts:30

***

### state

> `protected` `readonly` **state**: `RelationshipBuilderState`

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

### toSchema()

> **toSchema**(`name?`): [`HasManyRelationshipSchema`](../interfaces/HasManyRelationshipSchema.md)

Defined in: relationships/has-many.d.ts:33

Finalizes the builder into a `HasManyRelationshipSchema`.

#### Parameters

##### name?

`string`

#### Returns

[`HasManyRelationshipSchema`](../interfaces/HasManyRelationshipSchema.md)

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
