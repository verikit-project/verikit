[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / ResourceLayoutBuilder

# Class: ResourceLayoutBuilder\<TFields, TRelationships\>

Defined in: [resource/resource.ts:268](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L268)

Builder passed into `.form()` factories; resolves field/relationship
names into schema nodes and assembles them into layout tree nodes.

## Type Parameters

### TFields

`TFields` _extends_ [`FieldMap`](../type-aliases/FieldMap.md)

### TRelationships

`TRelationships` _extends_ [`RelationshipMap`](../type-aliases/RelationshipMap.md) = [`RelationshipMap`](../type-aliases/RelationshipMap.md)

## Constructors

### Constructor

> **new ResourceLayoutBuilder**\<`TFields`, `TRelationships`>\>(`fields`, `relationships`): `ResourceLayoutBuilder`\<`TFields`, `TRelationships`>\>

Defined in: [resource/resource.ts:283](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L283)

#### Parameters

##### fields

`{ [K in string]: ReturnType<TFields[K]["toSchema"]> }`

##### relationships

`{ [K in string]: ReturnType<TRelationships[K]["toSchema"]> }`

#### Returns

`ResourceLayoutBuilder`\<`TFields`, `TRelationships`\>

## Methods

### action()

> **action**(`name`, `options?`): [`ActionNode`](../interfaces/ActionNode.md)

Defined in: [resource/resource.ts:409](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L409)

Builds an `ActionNode` with an optional label and input children.

#### Parameters

##### name

`string`

##### options?

###### input?

readonly `LayoutChild`\<`TFields`, `TRelationships`\>[]

###### label?

`string`

#### Returns

[`ActionNode`](../interfaces/ActionNode.md)

---

### field()

> **field**\<`TName`>\>(`name`): [`FieldNode`](../interfaces/FieldNode.md)

Defined in: [resource/resource.ts:296](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L296)

Returns the finalized field node for `name`.

#### Type Parameters

##### TName

`TName` _extends_ `string`

#### Parameters

##### name

`TName`

#### Returns

[`FieldNode`](../interfaces/FieldNode.md)

#### Throws

If unknown.

---

### grid()

> **grid**(`columns`, `children`): [`GridNode`](../interfaces/GridNode.md)

Defined in: [resource/resource.ts:353](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L353)

Builds a `GridNode` with the given column count and children.

#### Parameters

##### columns

`number`

##### children

readonly `LayoutChild`\<`TFields`, `TRelationships`\>[]

#### Returns

[`GridNode`](../interfaces/GridNode.md)

---

### relationship()

> **relationship**\<`TName`>\>(`name`): [`RelationshipSchema`](../type-aliases/RelationshipSchema.md)

Defined in: [resource/resource.ts:305](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L305)

Returns the finalized relationship node for `name`.

#### Type Parameters

##### TName

`TName` _extends_ `string`

#### Parameters

##### name

`TName`

#### Returns

[`RelationshipSchema`](../type-aliases/RelationshipSchema.md)

#### Throws

If unknown.

---

### repeater()

> **repeater**(`name`, `children`): [`RepeaterNode`](../interfaces/RepeaterNode.md)

Defined in: [resource/resource.ts:397](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L397)

Builds a `RepeaterNode` from the given name and children.

#### Parameters

##### name

`string`

##### children

readonly `LayoutChild`\<`TFields`, `TRelationships`\>[]

#### Returns

[`RepeaterNode`](../interfaces/RepeaterNode.md)

---

### section()

> **section**(`title`, `children`): [`SectionNode`](../interfaces/SectionNode.md)

Defined in: [resource/resource.ts:341](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L341)

Builds a titled `SectionNode` from the given children.

#### Parameters

##### title

`string`

##### children

readonly `LayoutChild`\<`TFields`, `TRelationships`\>[]

#### Returns

[`SectionNode`](../interfaces/SectionNode.md)

---

### tabs()

> **tabs**(`tabs`): [`TabsNode`](../interfaces/TabsNode.md)

Defined in: [resource/resource.ts:365](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L365)

Builds a `TabsNode`, resolving each tab's children.

#### Parameters

##### tabs

readonly `object`[]

#### Returns

[`TabsNode`](../interfaces/TabsNode.md)

---

### wizard()

> **wizard**(`steps`): [`WizardNode`](../interfaces/WizardNode.md)

Defined in: [resource/resource.ts:381](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/resource/resource.ts#L381)

Builds a `WizardNode`, resolving each step's children.

#### Parameters

##### steps

readonly `object`[]

#### Returns

[`WizardNode`](../interfaces/WizardNode.md)
