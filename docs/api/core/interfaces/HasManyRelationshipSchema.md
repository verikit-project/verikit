[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / HasManyRelationshipSchema

# Interface: HasManyRelationshipSchema

Defined in: relationships/has-many.d.ts:7

Schema describing a has-many relationship.
The target resource stores the foreign key to this resource.

## Properties

### displayField?

> `optional` **displayField?**: `string`

Defined in: relationships/has-many.d.ts:23

Field on the target resource shown when this relationship is rendered.

***

### foreignKey?

> `optional` **foreignKey?**: `unknown`

Defined in: relationships/has-many.d.ts:21

Foreign key column (on the target resource) used to find matching rows.

***

### inverse?

> `optional` **inverse?**: `string`

Defined in: relationships/has-many.d.ts:19

Name of the corresponding relationship field on the target resource.

***

### label?

> `optional` **label?**: `string`

Defined in: relationships/has-many.d.ts:17

Display label shown to users in forms and tables.

***

### name?

> `optional` **name?**: `string`

Defined in: relationships/has-many.d.ts:13

Name of the relationship on its owning resource, set by `toSchema`.

***

### relationshipType

> **relationshipType**: `"hasMany"`

Defined in: relationships/has-many.d.ts:11

Literal discriminator identifying this as a has-many relationship.

***

### resource

> **resource**: `string`

Defined in: relationships/has-many.d.ts:15

Name of the target resource this relationship points at.

***

### type

> **type**: `"relationship"`

Defined in: relationships/has-many.d.ts:9

Literal "relationship" discriminator for discriminated unions.
