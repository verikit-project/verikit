[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / InferActionInput

# Type Alias: InferActionInput\<TAction\>

> **InferActionInput**\<`TAction`\> = `TAction` *extends* [`ActionBuilder`](../classes/ActionBuilder.md)\<`string`, infer TForm, infer \_TContext, infer \_TRecord, infer \_TResult\> ? [`InferActionForm`](InferActionForm.md)\<`TForm`\> : `never`

Defined in: types/action-form.d.ts:10

Extracts the validated input value shape from an action builder.

## Type Parameters

### TAction

`TAction`
