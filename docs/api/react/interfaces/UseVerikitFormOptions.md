[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / UseVerikitFormOptions

# Interface: UseVerikitFormOptions\<TResult\>

Defined in: packages/react/dist/form/use-verikit-form.d.ts:8

Options for creating a flat Verikit form hook instance.

## Type Parameters

### TResult

`TResult` = `unknown`

## Properties

### defaultValues?

> `optional` **defaultValues?**: [`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

Defined in: packages/react/dist/form/use-verikit-form.d.ts:12

Initial values passed to TanStack Form.

***

### fields

> **fields**: [`VerikitFormSource`](../type-aliases/VerikitFormSource.md)

Defined in: packages/react/dist/form/use-verikit-form.d.ts:10

Fields, resource builder, or resource schema backing the form.

***

### onSubmit?

> `optional` **onSubmit?**: (`values`) => `TResult` \| `Promise`\<`TResult`\>

Defined in: packages/react/dist/form/use-verikit-form.d.ts:14

Callback invoked after successful inference and validation.

#### Parameters

##### values

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`TResult` \| `Promise`\<`TResult`\>
