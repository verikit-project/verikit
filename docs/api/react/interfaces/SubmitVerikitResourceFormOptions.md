[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / SubmitVerikitResourceFormOptions

# Interface: SubmitVerikitResourceFormOptions\<TResult\>

Defined in: packages/react/dist/form/submission.d.ts:38

Options for inferring, validating, and optionally submitting a resource form.

## Type Parameters

### TResult

`TResult` = `unknown`

## Properties

### fields

> **fields**: [`VerikitFormFields`](../type-aliases/VerikitFormFields.md)

Defined in: packages/react/dist/form/submission.d.ts:40

Field schema map used for inference and validation.

***

### onSubmit?

> `optional` **onSubmit?**: (`values`) => `TResult` \| `Promise`\<`TResult`\>

Defined in: packages/react/dist/form/submission.d.ts:44

Optional callback invoked with inferred and validated values.

#### Parameters

##### values

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`TResult` \| `Promise`\<`TResult`\>

***

### values

> **values**: [`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

Defined in: packages/react/dist/form/submission.d.ts:42

Raw form values to submit.
