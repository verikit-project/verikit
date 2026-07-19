[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / InferActionForm

# Type Alias: InferActionForm\<TForm\>

> **InferActionForm**\<`TForm`\> = `string` *extends* keyof `TForm` ? `Record`\<`string`, `unknown`\> : `{ [K in keyof TForm]: InferField<TForm[K]> }`

Defined in: types/action-form.d.ts:6

Extracts the validated input value shape from an action form map.

## Type Parameters

### TForm

`TForm` *extends* [`ActionFormMap`](ActionFormMap.md)
