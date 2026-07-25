[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / RenderFieldProps

# Interface: RenderFieldProps

Defined in: packages/react/dist/fields/registry.d.ts:21

Props for rendering one Verikit field through a registry lookup.

## Extends

- [`VerikitFieldComponentProps`](VerikitFieldComponentProps.md)

## Properties

### className?

> `optional` **className?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:20

Class name applied to the outer field shell.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`className`](VerikitFieldComponentProps.md#classname)

***

### disabled?

> `optional` **disabled?**: `boolean`

Defined in: packages/react/dist/fields/types.d.ts:16

Disables user input for the field.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`disabled`](VerikitFieldComponentProps.md#disabled)

***

### error?

> `optional` **error?**: [`ReactNode`](../type-aliases/ReactNode.md)

Defined in: packages/react/dist/fields/types.d.ts:14

Error content shown below the field and linked with ARIA.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`error`](VerikitFieldComponentProps.md#error)

***

### field

> **field**: `FieldSchema`

Defined in: packages/react/dist/fields/registry.d.ts:23

Schema metadata for the field being rendered.

#### Overrides

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`field`](VerikitFieldComponentProps.md#field)

***

### id?

> `optional` **id?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:8

Explicit input id. Defaults to a stable id derived from the field name.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`id`](VerikitFieldComponentProps.md#id)

***

### inputClassName?

> `optional` **inputClassName?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:22

Class name applied to the concrete input control.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`inputClassName`](VerikitFieldComponentProps.md#inputclassname)

***

### name?

> `optional` **name?**: `string`

Defined in: packages/react/dist/fields/types.d.ts:10

HTML form field name. Defaults to the schema field name.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`name`](VerikitFieldComponentProps.md#name)

***

### onBlur?

> `optional` **onBlur?**: () => `void`

Defined in: packages/react/dist/fields/types.d.ts:24

Called when the rendered input loses focus.

#### Returns

`void`

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`onBlur`](VerikitFieldComponentProps.md#onblur)

***

### onValueChange?

> `optional` **onValueChange?**: (`value`) => `void`

Defined in: packages/react/dist/fields/types.d.ts:26

Called with the next field value when user input changes.

#### Parameters

##### value

`unknown`

#### Returns

`void`

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`onValueChange`](VerikitFieldComponentProps.md#onvaluechange)

***

### readOnly?

> `optional` **readOnly?**: `boolean`

Defined in: packages/react/dist/fields/types.d.ts:18

Marks the field as read-only when supported by the input.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`readOnly`](VerikitFieldComponentProps.md#readonly)

***

### registry?

> `optional` **registry?**: `Partial`\<[`VerikitFieldRegistry`](../type-aliases/VerikitFieldRegistry.md)\>

Defined in: packages/react/dist/fields/registry.d.ts:25

Optional renderer overrides keyed by field type.

***

### value?

> `optional` **value?**: `unknown`

Defined in: packages/react/dist/fields/types.d.ts:12

Current field value.

#### Inherited from

[`VerikitFieldComponentProps`](VerikitFieldComponentProps.md).[`value`](VerikitFieldComponentProps.md#value)
