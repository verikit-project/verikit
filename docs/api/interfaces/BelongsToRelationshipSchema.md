[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / BelongsToRelationshipSchema

# Interface: BelongsToRelationshipSchema

Defined in: [relationships/belongs-to.ts:11](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L11)

Schema describing a belongs-to relationship.
This resource stores the foreign key to the target resource.

## Properties

### displayField?

> `optional` **displayField?**: `string`

Defined in: [relationships/belongs-to.ts:27](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L27)

Field on the target resource shown when this relationship is rendered.

---

### foreignKey?

> `optional` **foreignKey?**: `unknown`

Defined in: [relationships/belongs-to.ts:25](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L25)

Foreign key column (on this resource) used to look up the target row.

---

### inverse?

> `optional` **inverse?**: `string`

Defined in: [relationships/belongs-to.ts:23](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L23)

Name of the corresponding relationship field on the target resource.

---

### label?

> `optional` **label?**: `string`

Defined in: [relationships/belongs-to.ts:21](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L21)

Display label shown to users in forms and tables.

---

### name?

> `optional` **name?**: `string`

Defined in: [relationships/belongs-to.ts:17](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L17)

Name of the relationship on its owning resource, set by `toSchema`.

---

### relationshipType

> **relationshipType**: `"belongsTo"`

Defined in: [relationships/belongs-to.ts:15](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L15)

Literal discriminator identifying this as a belongs-to relationship.

---

### resource

> **resource**: `string`

Defined in: [relationships/belongs-to.ts:19](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L19)

Name of the target resource this relationship points at.

---

### type

> **type**: `"relationship"`

Defined in: [relationships/belongs-to.ts:13](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/relationships/belongs-to.ts#L13)

Literal "relationship" discriminator for discriminated unions.
