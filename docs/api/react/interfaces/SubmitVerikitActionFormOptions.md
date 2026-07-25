[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / SubmitVerikitActionFormOptions

# Interface: SubmitVerikitActionFormOptions\<TForm, TContext, TRecord, TResult\>

Defined in: packages/react/dist/form/submission.d.ts:47

Options for inferring values and running a Verikit action.

## Type Parameters

### TForm

`TForm` *extends* `ActionFormMap` = `ActionFormMap`

### TContext

`TContext` = `unknown`

### TRecord

`TRecord` = `unknown`

### TResult

`TResult` = `unknown`

## Properties

### action

> **action**: `ActionBuilder`\<`string`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: packages/react/dist/form/submission.d.ts:49

Action whose runtime form and handler should be used.

***

### request

> **request**: `Omit`\<`ActionRunRequest`\<`TContext`, `TRecord`\>, `"input"`\>

Defined in: packages/react/dist/form/submission.d.ts:51

Action request without input; inferred values are supplied as input.

***

### values

> **values**: [`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

Defined in: packages/react/dist/form/submission.d.ts:53

Raw form values to infer before running the action.
