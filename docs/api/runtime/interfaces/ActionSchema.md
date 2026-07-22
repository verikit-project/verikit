[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / ActionSchema

# Interface: ActionSchema\<TName\>

Defined in: schema/action-schema.d.ts:5

Serializable action shape for adapters and layout renderers.

## Type Parameters

### TName

`TName` *extends* `string` = `string`

## Properties

### confirmation?

> `optional` **confirmation?**: [`ActionConfirmation`](ActionConfirmation.md)

Defined in: schema/action-schema.d.ts:12

***

### description?

> `optional` **description?**: `string`

Defined in: schema/action-schema.d.ts:9

***

### form?

> `optional` **form?**: `Record`\<`string`, `FieldSchema`\>

Defined in: schema/action-schema.d.ts:13

***

### icon?

> `optional` **icon?**: `string`

Defined in: schema/action-schema.d.ts:10

***

### label?

> `optional` **label?**: `string`

Defined in: schema/action-schema.d.ts:8

***

### meta?

> `optional` **meta?**: `Record`\<`string`, `unknown`\>

Defined in: schema/action-schema.d.ts:18

***

### name

> **name**: `TName`

Defined in: schema/action-schema.d.ts:7

***

### result?

> `optional` **result?**: `object`

Defined in: schema/action-schema.d.ts:14

#### errorMessage?

> `optional` **errorMessage?**: `string`

#### successMessage?

> `optional` **successMessage?**: `string`

***

### type

> **type**: `"action"`

Defined in: schema/action-schema.d.ts:6

***

### variant?

> `optional` **variant?**: `"primary"` \| `"secondary"` \| `"danger"`

Defined in: schema/action-schema.d.ts:11
