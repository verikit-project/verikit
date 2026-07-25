[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / ActionState

# Interface: ActionState\<TContext, TRecord, TInput, TResult\>

Defined in: actions/builders/action-builder.d.ts:10

## Type Parameters

### TContext

`TContext`

### TRecord

`TRecord`

### TInput

`TInput`

### TResult

`TResult`

## Properties

### confirmation?

> `optional` **confirmation?**: [`ActionConfirmation`](ActionConfirmation.md)

Defined in: actions/builders/action-builder.d.ts:12

***

### form?

> `optional` **form?**: [`ActionFormMap`](../type-aliases/ActionFormMap.md)

Defined in: actions/builders/action-builder.d.ts:13

***

### handler?

> `optional` **handler?**: [`ActionHandler`](../type-aliases/ActionHandler.md)\<`TContext`, `TRecord`, `TInput`, `TResult`\>

Defined in: actions/builders/action-builder.d.ts:16

***

### hooks?

> `optional` **hooks?**: [`ActionHooks`](ActionHooks.md)\<`TContext`, `TRecord`, `TInput`, `TResult`\>

Defined in: actions/builders/action-builder.d.ts:18

***

### isAvailable?

> `optional` **isAvailable?**: (`run`) => [`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md) \| `Promise`\<[`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md)\>

Defined in: actions/builders/action-builder.d.ts:14

#### Parameters

##### run

[`ActionAvailabilityContext`](ActionAvailabilityContext.md)\<`TContext`, `TRecord`\>

#### Returns

[`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md) \| `Promise`\<[`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md)\>

***

### permissions?

> `optional` **permissions?**: `PermissionsBuilder`\<`TContext`, `TRecord`, `string`, `string`\>

Defined in: actions/builders/action-builder.d.ts:15

***

### presentation

> **presentation**: [`ActionPresentation`](ActionPresentation.md)

Defined in: actions/builders/action-builder.d.ts:11

***

### result?

> `optional` **result?**: [`ActionResultOptions`](ActionResultOptions.md)\<`TResult`\>

Defined in: actions/builders/action-builder.d.ts:17
