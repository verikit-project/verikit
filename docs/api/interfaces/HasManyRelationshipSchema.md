[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / HasManyRelationshipSchema

# Interface: HasManyRelationshipSchema

Defined in: [relationships/has-many.ts:11](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L11)

Schema describing a has-many relationship.
The target resource stores the foreign key to this resource.

## Properties

### displayField?

> `optional` **displayField?**: `string`

Defined in: [relationships/has-many.ts:27](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L27)

Field on the target resource shown when this relationship is rendered.

***

### foreignKey?

> `optional` **foreignKey?**: `unknown`

Defined in: [relationships/has-many.ts:25](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L25)

Foreign key column (on the target resource) used to find matching rows.

***

### inverse?

> `optional` **inverse?**: `string`

Defined in: [relationships/has-many.ts:23](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L23)

Name of the corresponding relationship field on the target resource.

***

### label?

> `optional` **label?**: `string`

Defined in: [relationships/has-many.ts:21](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L21)

Display label shown to users in forms and tables.

***

### name?

> `optional` **name?**: `string`

Defined in: [relationships/has-many.ts:17](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L17)

Name of the relationship on its owning resource, set by `toSchema`.

***

### relationshipType

> **relationshipType**: `"hasMany"`

Defined in: [relationships/has-many.ts:15](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L15)

Literal discriminator identifying this as a has-many relationship.

***

### resource

> **resource**: `string`

Defined in: [relationships/has-many.ts:19](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L19)

Name of the target resource this relationship points at.

***

### type

> **type**: `"relationship"`

Defined in: [relationships/has-many.ts:13](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/has-many.ts#L13)

Literal "relationship" discriminator for discriminated unions.
