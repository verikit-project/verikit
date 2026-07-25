[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / SchemaRenderProps

# Interface: SchemaRenderProps

Defined in: packages/react/dist/layout/types.d.ts:6

Shared props used while rendering Verikit schema nodes.

## Extended by

- [`RenderSchemaNodeProps`](RenderSchemaNodeProps.md)
- [`RenderSchemaTreeProps`](RenderSchemaTreeProps.md)

## Properties

### activeStep?

> `optional` **activeStep?**: `number`

Defined in: packages/react/dist/layout/types.d.ts:24

Active step index for wizard nodes.

***

### activeTab?

> `optional` **activeTab?**: `number`

Defined in: packages/react/dist/layout/types.d.ts:20

Active tab index for tab nodes.

***

### disabled?

> `optional` **disabled?**: `boolean`

Defined in: packages/react/dist/layout/types.d.ts:14

Disables all rendered fields when supported.

***

### errors?

> `optional` **errors?**: `Record`\<`string`, [`ReactNode`](../type-aliases/ReactNode.md)\>

Defined in: packages/react/dist/layout/types.d.ts:12

Error content keyed by schema path.

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

***

### path?

> `optional` **path?**: [`SchemaPath`](../type-aliases/SchemaPath.md)

Defined in: packages/react/dist/layout/types.d.ts:10

Path prefix for nested schema nodes.

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: packages/react/dist/layout/types.d.ts:16

Marks all rendered fields as read-only when supported.

***

### registry?

> `optional` **registry?**: `Partial`\<[`VerikitFieldRegistry`](../type-aliases/VerikitFieldRegistry.md)\>

Defined in: packages/react/dist/layout/types.d.ts:18

Optional field renderer overrides.

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

***

### values

> **values**: `Record`\<`string`, `unknown`\>

Defined in: packages/react/dist/layout/types.d.ts:8

Current form values.
