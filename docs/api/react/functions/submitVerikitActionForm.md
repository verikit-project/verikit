[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / submitVerikitActionForm

# Function: submitVerikitActionForm()

> **submitVerikitActionForm**\<`TForm`, `TContext`, `TRecord`, `TResult`\>(`__namedParameters`): `Promise`\<[`VerikitActionSubmitResult`](../type-aliases/VerikitActionSubmitResult.md)\<`TResult`\>\>

Defined in: packages/react/dist/form/submission.d.ts:66

Infers action input values and runs the action with mapped field errors.

## Type Parameters

### TForm

`TForm` *extends* `ActionFormMap` = `ActionFormMap`

### TContext

`TContext` = `unknown`

### TRecord

`TRecord` = `unknown`

### TResult

`TResult` = `unknown`

## Parameters

### \_\_namedParameters

[`SubmitVerikitActionFormOptions`](../interfaces/SubmitVerikitActionFormOptions.md)\<`TForm`, `TContext`, `TRecord`, `TResult`\>

## Returns

`Promise`\<[`VerikitActionSubmitResult`](../type-aliases/VerikitActionSubmitResult.md)\<`TResult`\>\>
