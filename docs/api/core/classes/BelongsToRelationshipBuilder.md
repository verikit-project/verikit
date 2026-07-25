[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / BelongsToRelationshipBuilder

# Class: BelongsToRelationshipBuilder\<TResource\>

Defined in: relationships/belongs-to.d.ts:29

Fluent builder for belongs-to relationships: this resource holds the
foreign key.

## Extends

- `RelationshipBuilder`\<`TResource`, `RelationshipBuilderState`\>

## Type Parameters

### TResource

`TResource` *extends* [`Resource`](Resource.md) = [`Resource`](Resource.md)

## Constructors

### Constructor

> **new BelongsToRelationshipBuilder**\<`TResource`\>(`target`, `state?`): `BelongsToRelationshipBuilder`\<`TResource`\>

Defined in: relationships/belongs-to.d.ts:31

#### Parameters

##### target

() => `TResource`

##### state?

`RelationshipBuilderState`

#### Returns

`BelongsToRelationshipBuilder`\<`TResource`\>

#### Overrides

`RelationshipBuilder<TResource, RelationshipBuilderState>.constructor`

## Properties

### kind

> `readonly` **kind**: `"belongsTo"` = `"belongsTo"`

Defined in: relationships/belongs-to.d.ts:30

***

### state

> `protected` `readonly` **state**: `RelationshipBuilderState`

Defined in: relationships/shared/relationship-builder.d.ts:18

#### Inherited from

`RelationshipBuilder.state`

***

### target

> `readonly` **target**: () => `TResource`

Defined in: relationships/shared/relationship-builder.d.ts:17

#### Returns

`TResource`

#### Inherited from

`RelationshipBuilder.target`

## Methods

### displayField()

> **displayField**(`field`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:41

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

Defined in: relationships/shared/relationship-builder.d.ts:30

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

Defined in: relationships/shared/relationship-builder.d.ts:28

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

Defined in: relationships/shared/relationship-builder.d.ts:26

Returns the name of the target resource.

#### Returns

`string`

#### Inherited from

`RelationshipBuilder.resourceName`

***

### toSchema()

> **toSchema**(`name?`): [`BelongsToRelationshipSchema`](../interfaces/BelongsToRelationshipSchema.md)

Defined in: relationships/belongs-to.d.ts:33

Finalizes the builder into a `BelongsToRelationshipSchema`.

#### Parameters

##### name?

`string`

#### Returns

[`BelongsToRelationshipSchema`](../interfaces/BelongsToRelationshipSchema.md)

***

### via()

> **via**(`foreignKey`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:39

Sets the foreign key used to look up matching rows.

Pass `resource.field("name")` or the field helper from
`defineResource({ relationships: (field) => ... })` for compile-time
checked resource field names. Adapter-specific column reference objects
are also accepted.

#### Parameters

##### foreignKey

`RelationshipForeignKey`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.via`

***

### withState()

> `protected` **withState**(`patch`): `this`

Defined in: relationships/shared/relationship-builder.d.ts:24

Creates a new instance of the current concrete builder (via
`this.constructor`) so subclass setters stay available after chaining.

#### Parameters

##### patch

`Partial`\<`TState`\>

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.withState`
