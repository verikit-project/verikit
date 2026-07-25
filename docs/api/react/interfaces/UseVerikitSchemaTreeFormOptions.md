[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / UseVerikitSchemaTreeFormOptions

# Interface: UseVerikitSchemaTreeFormOptions\<TResult\>

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:9

Options for creating a schema tree form hook instance.

## Type Parameters

### TResult

`TResult` = `unknown`

## Properties

### defaultValues?

> `optional` **defaultValues?**: [`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:13

Initial values passed to TanStack Form.

***

### onSubmit?

> `optional` **onSubmit?**: (`values`) => `TResult` \| `Promise`\<`TResult`\>

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:15

Callback invoked after successful inference and validation.

#### Parameters

##### values

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`TResult` \| `Promise`\<`TResult`\>

***

### resource

> **resource**: [`VerikitSchemaTreeSource`](../type-aliases/VerikitSchemaTreeSource.md)

Defined in: packages/react/dist/form/use-verikit-schema-tree-form.d.ts:11

Resource builder or schema containing the tree to render.
