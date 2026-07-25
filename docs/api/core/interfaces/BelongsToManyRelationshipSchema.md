[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / BelongsToManyRelationshipSchema

# Interface: BelongsToManyRelationshipSchema

Defined in: relationships/belongs-to-many.d.ts:7

Schema describing a many-to-many relationship, typically resolved through
a join/through resource.

## Properties

### displayField?

> `optional` **displayField?**: `string`

Defined in: relationships/belongs-to-many.d.ts:25

Field on the target resource shown when this relationship is rendered.

***

### foreignKey?

> `optional` **foreignKey?**: `unknown`

Defined in: relationships/belongs-to-many.d.ts:23

Foreign key column used by the join to look up matching rows.

***

### inverse?

> `optional` **inverse?**: `string`

Defined in: relationships/belongs-to-many.d.ts:19

Name of the corresponding relationship field on the target resource.

***

### label?

> `optional` **label?**: `string`

Defined in: relationships/belongs-to-many.d.ts:17

Display label shown to users in forms and tables.

***

### name?

> `optional` **name?**: `string`

Defined in: relationships/belongs-to-many.d.ts:13

Name of the relationship on its owning resource, set by `toSchema`.

***

### relationshipType

> **relationshipType**: `"belongsToMany"`

Defined in: relationships/belongs-to-many.d.ts:11

Literal discriminator identifying this as a belongs-to-many relationship.

***

### resource

> **resource**: `string`

Defined in: relationships/belongs-to-many.d.ts:15

Name of the target resource this relationship points at.

***

### through?

> `optional` **through?**: `string`

Defined in: relationships/belongs-to-many.d.ts:21

Name of the join/through resource linking the two sides.

***

### type

> **type**: `"relationship"`

Defined in: relationships/belongs-to-many.d.ts:9

Literal "relationship" discriminator for discriminated unions.
