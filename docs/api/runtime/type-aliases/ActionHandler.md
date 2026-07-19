[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / ActionHandler

# Type Alias: ActionHandler\<TContext, TRecord, TInput, TResult\>

> **ActionHandler**\<`TContext`, `TRecord`, `TInput`, `TResult`\> = (`run`) => `TResult` \| `Promise`\<`TResult`\>

Defined in: types/action-handler.d.ts:3

Function that performs the action's side effect.

## Type Parameters

### TContext

`TContext`

### TRecord

`TRecord`

### TInput

`TInput`

### TResult

`TResult`

## Parameters

### run

[`ActionRunContext`](../interfaces/ActionRunContext.md)\<`TContext`, `TRecord`, `TInput`\>

## Returns

`TResult` \| `Promise`\<`TResult`\>
