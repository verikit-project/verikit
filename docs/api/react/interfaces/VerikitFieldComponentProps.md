[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / VerikitFieldComponentProps

# Interface: VerikitFieldComponentProps\<TValue\>

Defined in: packages/react/dist/fields/types.d.ts:4

Props passed to every Verikit field component.

## Extended by

- [`RenderFieldProps`](RenderFieldProps.md)

## Type Parameters

### TValue

`TValue` = `unknown`

## Properties

### className?

> `optional` **className?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:20

Class name applied to the outer field shell.

***

### disabled?

> `optional` **disabled?**: `boolean`

Defined in: packages/react/dist/fields/types.d.ts:16

Disables user input for the field.

***

### error?

> `optional` **error?**: [`ReactNode`](../type-aliases/ReactNode.md)

Defined in: packages/react/dist/fields/types.d.ts:14

Error content shown below the field and linked with ARIA.

***

### field

> **field**: `FieldSchema`

Defined in: packages/react/dist/fields/types.d.ts:6

Schema metadata for the field being rendered.

***

### id?

> `optional` **id?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:8

Explicit input id. Defaults to a stable id derived from the field name.

***

### inputClassName?

> `optional` **inputClassName?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:22

Class name applied to the concrete input control.

***

### name?

> `optional` **name?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:10

HTML form field name. Defaults to the schema field name.

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: packages/react/dist/fields/types.d.ts:24

Called when the rendered input loses focus.

#### Returns

`void`

***

### onValueChange?

> `optional` **onValueChange?**: (`value`) => `void`

Defined in: packages/react/dist/fields/types.d.ts:26

Called with the next field value when user input changes.

#### Parameters

##### value

`TValue`

#### Returns

`void`

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: packages/react/dist/fields/types.d.ts:18

Marks the field as read-only when supported by the input.

***

### value?

> `optional` **value?**: `TValue`

Defined in: packages/react/dist/fields/types.d.ts:12

Current field value.
