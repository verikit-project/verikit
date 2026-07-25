[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / SubmitVerikitSchemaTreeFormOptions

# Interface: SubmitVerikitSchemaTreeFormOptions\<TResult\>

Defined in: packages/react/dist/form/schema-tree.d.ts:4

Options for inferring, validating, and submitting schema tree form values.

## Type Parameters

### TResult

`TResult` = `unknown`

## Properties

### onSubmit?

> `optional` **onSubmit?**: (`values`) => `TResult` \| `Promise`\<`TResult`\>

Defined in: packages/react/dist/form/schema-tree.d.ts:10

Optional callback invoked with inferred and validated values.

#### Parameters

##### values

[`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

#### Returns

`TResult` \| `Promise`\<`TResult`\>

***

### tree

> **tree**: readonly `SchemaNode`[]

Defined in: packages/react/dist/form/schema-tree.d.ts:6

Schema nodes that describe the rendered form tree.

***

### values

> **values**: [`VerikitFormValues`](../type-aliases/VerikitFormValues.md)

Defined in: packages/react/dist/form/schema-tree.d.ts:8

Raw form values keyed by schema path.
