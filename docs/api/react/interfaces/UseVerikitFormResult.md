[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / UseVerikitFormResult

# Interface: UseVerikitFormResult\<TResult\>

Defined in: packages/react/dist/form/use-verikit-form.d.ts:17

State and helpers returned by [useVerikitForm](../functions/useVerikitForm.md).

## Type Parameters

### TResult

`TResult` = `unknown`

## Properties

### clearFieldErrors

> **clearFieldErrors**: () => `void`

Defined in: packages/react/dist/form/use-verikit-form.d.ts:27

Clears all field errors.

#### Returns

`void`

***

### fieldErrors

> **fieldErrors**: [`VerikitFieldErrors`](../type-aliases/VerikitFieldErrors.md)

Defined in: packages/react/dist/form/use-verikit-form.d.ts:23

Current field error messages.

***

### fields

> **fields**: [`VerikitFormFields`](../type-aliases/VerikitFormFields.md)

Defined in: packages/react/dist/form/use-verikit-form.d.ts:21

Resolved field schema map.

***

### form

> **form**: `AnyFormApi`

Defined in: packages/react/dist/form/use-verikit-form.d.ts:19

Underlying TanStack Form API instance.

***

### getFieldError

> **getFieldError**: (`name`) => `string` \| `undefined`

Defined in: packages/react/dist/form/use-verikit-form.d.ts:33

Returns the first error message for a field name.

#### Parameters

##### name

`string`

#### Returns

`string` \| `undefined`

***

### getFieldProps

> **getFieldProps**: (`name`) => [`VerikitFieldComponentProps`](VerikitFieldComponentProps.md)

Defined in: packages/react/dist/form/use-verikit-form.d.ts:35

Builds props for rendering a field with the registry components.

#### Parameters

##### name

`string`

#### Returns

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md)

***

### setFieldErrors

> **setFieldErrors**: (`errors`) => `void`

Defined in: packages/react/dist/form/use-verikit-form.d.ts:25

Replaces the current field error map.

#### Parameters

##### errors

[`VerikitFieldErrors`](../type-aliases/VerikitFieldErrors.md)

#### Returns

`void`

***

### submit

> **submit**: (`values?`) => `Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`TResult` \| `undefined`\>\>

Defined in: packages/react/dist/form/use-verikit-form.d.ts:31

Infers, validates, and submits values.

#### Parameters

##### values?

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`TResult` \| `undefined`\>\>

***

### validate

> **validate**: (`values?`) => `Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`undefined`\>\>

Defined in: packages/react/dist/form/use-verikit-form.d.ts:29

Infers and validates values without calling the submit callback.

#### Parameters

##### values?

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`undefined`\>\>
