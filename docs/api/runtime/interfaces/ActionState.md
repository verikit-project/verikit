[**@verikit/runtime**](../README.md)

***

[@verikit/runtime](../README.md) / ActionState

# Interface: ActionState\<TContext, TRecord, TInput, TResult\>

Defined in: builders/action-builder.d.ts:9

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

Defined in: builders/action-builder.d.ts:11

***

### form?

> `optional` **form?**: [`ActionFormMap`](../type-aliases/ActionFormMap.md)

Defined in: builders/action-builder.d.ts:12

***

### handler?

> `optional` **handler?**: [`ActionHandler`](../type-aliases/ActionHandler.md)\<`TContext`, `TRecord`, `TInput`, `TResult`\>

Defined in: builders/action-builder.d.ts:16

***

### hooks?

> `optional` **hooks?**: [`ActionHooks`](ActionHooks.md)\<`TContext`, `TRecord`, `TInput`, `TResult`\>

Defined in: builders/action-builder.d.ts:18

***

### isAvailable?

> `optional` **isAvailable?**: (`run`) => [`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md) \| `Promise`\<[`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md)\>

Defined in: builders/action-builder.d.ts:13

#### Parameters

##### run

`Omit`\<[`ActionRunContext`](ActionRunContext.md)\<`TContext`, `TRecord`, `TInput`\>, `"input"`\> & `object`

#### Returns

[`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md) \| `Promise`\<[`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md)\>

***

### presentation

> **presentation**: [`ActionPresentation`](ActionPresentation.md)

Defined in: builders/action-builder.d.ts:10

***

### result?

> `optional` **result?**: [`ActionResultOptions`](ActionResultOptions.md)\<`TResult`\>

Defined in: builders/action-builder.d.ts:17
