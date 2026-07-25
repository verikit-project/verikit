[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / runAction

# Function: runAction()

> **runAction**\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>(`action`, `request`): `Promise`\<[`ActionRunResult`](../type-aliases/ActionRunResult.md)\<`TResult`\>\>

Defined in: actions/execution/run-action.d.ts:14

Runs an action, including a permissions check, availability checks, form
validation, lifecycle hooks, and execution.

Any error thrown by the `before` hook, action handler, or `after`
hook causes the action to fail. The optional `error` hook is then
invoked. Errors thrown by the `error` hook are ignored so they do
not mask the original execution failure.

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
