[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / BelongsToRelationshipSchema

# Interface: BelongsToRelationshipSchema

Defined in: relationships/belongs-to.d.ts:7

Schema describing a belongs-to relationship.
This resource stores the foreign key to the target resource.

## Properties

### displayField?

> `optional` **displayField?**: `string`

Defined in: relationships/belongs-to.d.ts:23

Field on the target resource shown when this relationship is rendered.

***

### foreignKey?

> `optional` **foreignKey?**: `unknown`

Defined in: relationships/belongs-to.d.ts:21

Foreign key column (on this resource) used to look up the target row.

***

### inverse?

> `optional` **inverse?**: `string`

Defined in: relationships/belongs-to.d.ts:19

Name of the corresponding relationship field on the target resource.

***

### label?

> `optional` **label?**: `string`

Defined in: relationships/belongs-to.d.ts:17

Display label shown to users in forms and tables.

***

### name?

> `optional` **name?**: `string`

Defined in: relationships/belongs-to.d.ts:13

Name of the relationship on its owning resource, set by `toSchema`.

***

### relationshipType

> **relationshipType**: `"belongsTo"`

Defined in: relationships/belongs-to.d.ts:11

Literal discriminator identifying this as a belongs-to relationship.

***

### resource

> **resource**: `string`

Defined in: relationships/belongs-to.d.ts:15

Name of the target resource this relationship points at.

***

### type

> **type**: `"relationship"`

Defined in: relationships/belongs-to.d.ts:9

Literal "relationship" discriminator for discriminated unions.
