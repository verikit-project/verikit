[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / VerikitResourceSubmitSuccess

# Interface: VerikitResourceSubmitSuccess\<TResult\>

Defined in: packages/react/dist/form/submission.d.ts:21

Successful resource form submission result.

## Type Parameters

### TResult

`TResult` = `unknown`

## Properties

### fieldErrors

> **fieldErrors**: [`VerikitFieldErrors`](../type-aliases/VerikitFieldErrors.md)

Defined in: packages/react/dist/form/submission.d.ts:29

Empty field error map for successful submissions.

***

### result

> **result**: `TResult`

Defined in: packages/react/dist/form/submission.d.ts:27

Value returned by the submit callback.

***

### success

> **success**: `true`

Defined in: packages/react/dist/form/submission.d.ts:23

Marks the result as successful.

***

### value

> **value**: [`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

Defined in: packages/react/dist/form/submission.d.ts:25

Inferred and validated values.
