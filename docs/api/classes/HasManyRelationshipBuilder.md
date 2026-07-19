[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / HasManyRelationshipBuilder

# Class: HasManyRelationshipBuilder\<TResource\>

Defined in: [relationships/has-many.ts:34](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L34)

Fluent builder for has-many relationships.
The target resource stores the foreign key to this resource.

## Extends

- `RelationshipBuilder`\<`TResource`, `RelationshipBuilderState`\>

## Type Parameters

### TResource

`TResource` _extends_ [`Resource`](Resource.md) = [`Resource`](Resource.md)

## Constructors

### Constructor

> **new HasManyRelationshipBuilder**\<`TResource`>\>(`target`, `state?`): `HasManyRelationshipBuilder`\<`TResource`>\>

Defined in: [relationships/has-many.ts:39](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L39)

#### Parameters

##### target

() => `TResource`

##### state?

`RelationshipBuilderState` = `{}`

#### Returns

`HasManyRelationshipBuilder`\<`TResource`\>

#### Overrides

`RelationshipBuilder<TResource, RelationshipBuilderState>.constructor`

## Properties

### kind

> `readonly` **kind**: `"hasMany"` = `"hasMany"`

Defined in: [relationships/has-many.ts:37](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L37)

---

### state

> `protected` `readonly` **state**: `RelationshipBuilderState`

Defined in: [relationships/shared/relationship-builder.ts:25](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L25)

#### Inherited from

`RelationshipBuilder.state`

---

### target

> `readonly` **target**: () => `TResource`

Defined in: [relationships/shared/relationship-builder.ts:24](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L24)

#### Returns

`TResource`

#### Inherited from

`RelationshipBuilder.target`

## Methods

### displayField()

> **displayField**(`field`): `this`

Defined in: [relationships/shared/relationship-builder.ts:67](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L67)

Sets the field displayed for related records.

#### Parameters

##### field

keyof [`InferResourceFields`](../type-aliases/InferResourceFields.md)\<`TResource`\> & `string`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.displayField`

---

### inverse()

> **inverse**(`field`): `this`

Defined in: [relationships/shared/relationship-builder.ts:57](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L57)

Sets the inverse relationship on the target resource.

#### Parameters

##### field

`string`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.inverse`

---

### label()

> **label**(`label`): `this`

Defined in: [relationships/shared/relationship-builder.ts:52](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L52)

Sets a human-readable label for the relationship.

#### Parameters

##### label

`string`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.label`

---

### resourceName()

> **resourceName**(): `string`

Defined in: [relationships/shared/relationship-builder.ts:47](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L47)

Returns the name of the target resource.

#### Returns

`string`

#### Inherited from

`RelationshipBuilder.resourceName`

---

### toSchema()

> **toSchema**(`name?`): [`HasManyRelationshipSchema`](../interfaces/HasManyRelationshipSchema.md)

Defined in: [relationships/has-many.ts:44](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L44)

Finalizes the builder into a `HasManyRelationshipSchema`.

#### Parameters

##### name?

`string`

#### Returns

[`HasManyRelationshipSchema`](../interfaces/HasManyRelationshipSchema.md)

---

### via()

> **via**(`foreignKey`): `this`

Defined in: [relationships/shared/relationship-builder.ts:62](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L62)

Sets the foreign key column used to look up matching rows.

#### Parameters

##### foreignKey

`unknown`

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.via`

---

### withState()

> `protected` **withState**(`patch`): `this`

Defined in: [relationships/shared/relationship-builder.ts:36](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/shared/relationship-builder.ts#L36)

Creates a new instance of the current concrete builder (via
`this.constructor`) so subclass setters stay available after chaining.

#### Parameters

##### patch

`Partial`\<`TState`\>

#### Returns

`this`

#### Inherited from

`RelationshipBuilder.withState`
