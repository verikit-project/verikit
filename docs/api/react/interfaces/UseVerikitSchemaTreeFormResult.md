[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / UseVerikitSchemaTreeFormResult

# Interface: UseVerikitSchemaTreeFormResult\<TResult\>

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:20

State and helpers returned by [useVerikitSchemaTreeForm](../functions/useVerikitSchemaTreeForm.md).

## Type Parameters

### TResult

`TResult` = `unknown`

## Properties

### clearFieldErrors

> **clearFieldErrors**: () => `void`

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:30

Clears all field errors.

#### Returns

`void`

***

### fieldErrors

> **fieldErrors**: [`VerikitFieldErrors`](../type-aliases/VerikitFieldErrors.md)

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:26

Current field error messages keyed by schema path.

***

### form

> **form**: `AnyFormApi`

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:22

Underlying TanStack Form API instance.

***

### getFieldError

> **getFieldError**: (`path`) => `string` \| `undefined`

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:36

Returns the first error message for a schema path.

#### Parameters

##### path

[`SchemaPath`](../type-aliases/SchemaPath.md)

#### Returns

`string` \| `undefined`

***

### setFieldErrors

> **setFieldErrors**: (`errors`) => `void`

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:28

Replaces the current field error map.

#### Parameters

##### errors

[`VerikitFieldErrors`](../type-aliases/VerikitFieldErrors.md)

#### Returns

`void`

***

### submit

> **submit**: (`values?`) => `Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`TResult` \| `undefined`\>\>

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:34

Infers, validates, and submits values.

#### Parameters

##### values?

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`TResult` \| `undefined`\>\>

***

### tree

> **tree**: `SchemaNode`[]

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:24

Resolved schema tree nodes.

***

### treeProps

> **treeProps**: [`VerikitSchemaTreeRenderProps`](../type-aliases/VerikitSchemaTreeRenderProps.md)

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:38

Renderer props for wiring a schema tree to the hook state.

***

### validate

> **validate**: (`values?`) => `Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`undefined`\>\>

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:32

Infers and validates values without calling the submit callback.

#### Parameters

##### values?

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`Promise`\<[`VerikitResourceSubmitResult`](../type-aliases/VerikitResourceSubmitResult.md)\<`undefined`\>\>
