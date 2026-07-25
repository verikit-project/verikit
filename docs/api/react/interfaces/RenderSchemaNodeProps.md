[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / RenderSchemaNodeProps

# Interface: RenderSchemaNodeProps

Defined in: packages/react/dist/layout/types.d.ts:41

Props for rendering a single schema node.

## Extends

- [`SchemaRenderProps`](SchemaRenderProps.md)

## Properties

### activeStep?

> `optional` **activeStep?**: `number`

Defined in: packages/react/dist/layout/types.d.ts:24

Active step index for wizard nodes.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`activeStep`](SchemaRenderProps.md#activestep)

***

### activeTab?

> `optional` **activeTab?**: `number`

Defined in: packages/react/dist/layout/types.d.ts:20

Active tab index for tab nodes.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`activeTab`](SchemaRenderProps.md#activetab)

***

### className?

> `optional` **className?**: `string`

Defined in: packages/react/dist/layout/types.d.ts:45

Class name applied to the node wrapper when supported.

***

### disabled?

> `optional` **disabled?**: `boolean`

Defined in: packages/react/dist/layout/types.d.ts:14

Disables all rendered fields when supported.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`disabled`](SchemaRenderProps.md#disabled)

***

### errors?

> `optional` **errors?**: `Record`\<`string`, [`ReactNode`](../type-aliases/ReactNode.md)\>

Defined in: packages/react/dist/layout/types.d.ts:12

Error content keyed by schema path.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`errors`](SchemaRenderProps.md#errors)

***

### node

> **node**: `SchemaNode`

Defined in: packages/react/dist/layout/types.d.ts:43

Schema node to render.

***

### onAction?

> `optional` **onAction?**: (`name`, `path`) => `void`

Defined in: packages/react/dist/layout/types.d.ts:32

Called when an action node is triggered.

#### Parameters

##### name

`string`

##### path

[`SchemaPath`](../type-aliases/SchemaPath.md)

#### Returns

`void`

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`onAction`](SchemaRenderProps.md#onaction)

***

### onActiveStepChange?

> `optional` **onActiveStepChange?**: (`index`) => `void`

Defined in: packages/react/dist/layout/types.d.ts:26

Called when a wizard node changes active step.

#### Parameters

##### index

`number`

#### Returns

`void`

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`onActiveStepChange`](SchemaRenderProps.md#onactivestepchange)

***

### onActiveTabChange?

> `optional` **onActiveTabChange?**: (`index`) => `void`

Defined in: packages/react/dist/layout/types.d.ts:22

Called when a tab node changes active tab.

#### Parameters

##### index

`number`

#### Returns

`void`

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`onActiveTabChange`](SchemaRenderProps.md#onactivetabchange)

***

### onFieldBlur?

> `optional` **onFieldBlur?**: (`path`) => `void`

Defined in: packages/react/dist/layout/types.d.ts:30

Called when a field loses focus.

#### Parameters

##### path

[`SchemaPath`](../type-aliases/SchemaPath.md)

#### Returns

`void`

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`onFieldBlur`](SchemaRenderProps.md#onfieldblur)

***

### onFieldChange?

> `optional` **onFieldChange?**: (`path`, `value`) => `void`

Defined in: packages/react/dist/layout/types.d.ts:28

Called when a field value changes.

#### Parameters

##### path

[`SchemaPath`](../type-aliases/SchemaPath.md)

##### value

`unknown`

#### Returns

`void`

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`onFieldChange`](SchemaRenderProps.md#onfieldchange)

***

### onRepeaterAdd?

> `optional` **onRepeaterAdd?**: (`path`) => `void`

Defined in: packages/react/dist/layout/types.d.ts:34

Called when a repeater should append an item.

#### Parameters

##### path

[`SchemaPath`](../type-aliases/SchemaPath.md)

#### Returns

`void`

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`onRepeaterAdd`](SchemaRenderProps.md#onrepeateradd)

***

### onRepeaterRemove?

> `optional` **onRepeaterRemove?**: (`path`, `index`) => `void`

Defined in: packages/react/dist/layout/types.d.ts:36

Called when a repeater should remove an item.

#### Parameters

##### path

[`SchemaPath`](../type-aliases/SchemaPath.md)

##### index

`number`

#### Returns

`void`

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`onRepeaterRemove`](SchemaRenderProps.md#onrepeaterremove)

***

### path?

> `optional` **path?**: [`SchemaPath`](../type-aliases/SchemaPath.md)

Defined in: packages/react/dist/layout/types.d.ts:10

Path prefix for nested schema nodes.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`path`](SchemaRenderProps.md#path)

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: packages/react/dist/layout/types.d.ts:16

Marks all rendered fields as read-only when supported.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`readOnly`](SchemaRenderProps.md#readonly)

***

### registry?

> `optional` **registry?**: `Partial`\<[`VerikitFieldRegistry`](../type-aliases/VerikitFieldRegistry.md)\>

Defined in: packages/react/dist/layout/types.d.ts:18

Optional field renderer overrides.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`registry`](SchemaRenderProps.md#registry)

***

### renderRelationship?

> `optional` **renderRelationship?**: (`node`, `path`) => [`ReactNode`](../type-aliases/ReactNode.md)

Defined in: packages/react/dist/layout/types.d.ts:38

Custom renderer for relationship nodes.

#### Parameters

##### node

`RelationshipSchema`

##### path

[`SchemaPath`](../type-aliases/SchemaPath.md)

#### Returns

[`ReactNode`](../type-aliases/ReactNode.md)

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`renderRelationship`](SchemaRenderProps.md#renderrelationship)

***

### values

> **values**: `Record`\<`string`, `unknown`\>

Defined in: packages/react/dist/layout/types.d.ts:8

Current form values.

#### Inherited from

[`SchemaRenderProps`](SchemaRenderProps.md).[`values`](SchemaRenderProps.md#values)
