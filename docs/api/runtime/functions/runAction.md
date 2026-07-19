[**@verikit/runtime**](../README.md)

***

[@verikit/runtime](../README.md) / runAction

# Function: runAction()

> **runAction**\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>(`action`, `request`): `Promise`\<[`ActionRunResult`](../type-aliases/ActionRunResult.md)\<`TResult`\>\>

Defined in: execution/run-action.d.ts:13

Runs an action, including availability checks, form validation,
lifecycle hooks, and execution.

Any error thrown by the `before` hook, action handler, or `after`
hook causes the action to fail and invokes the `error` hook before
returning an execution failure.

## Type Parameters

### TName

`TName` *extends* `string`

### TForm

`TForm` *extends* [`ActionFormMap`](../type-aliases/ActionFormMap.md)

### TContext

`TContext`

### TRecord

`TRecord`

### TResult

`TResult`

## Parameters

### action

[`ActionBuilder`](../classes/ActionBuilder.md)\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

### request

[`ActionRunRequest`](../interfaces/ActionRunRequest.md)\<`TContext`, `TRecord`\>

## Returns

`Promise`\<[`ActionRunResult`](../type-aliases/ActionRunResult.md)\<`TResult`\>\>
