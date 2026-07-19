[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / EmailFieldBuilder

# Class: EmailFieldBuilder\<TValue\>

Defined in: fields/email.d.ts:14

Fluent builder for email fields. Attach `.validation()` for stricter
runtime checks than the field type alone communicates.

## Extends

- [`FieldBuilder`](FieldBuilder.md)\<`TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

## Type Parameters

### TValue

`TValue` = `string` \| `null` \| `undefined`

## Constructors

### Constructor

> **new EmailFieldBuilder**\<`TValue`\>(`state?`): `EmailFieldBuilder`\<`TValue`\>

Defined in: fields/email.d.ts:15

#### Parameters

##### state?

`Omit`\<[`EmailFieldSchema`](../interfaces/EmailFieldSchema.md), `"name"` \| `"type"`\>

#### Returns

`EmailFieldBuilder`\<`TValue`\>

#### Overrides

[`FieldBuilder`](FieldBuilder.md).[`constructor`](FieldBuilder.md#constructor)

## Properties

### $value

> `readonly` **$value**: `TValue`

Defined in: fields/base.d.ts:114

Phantom property used by InferField to extract TValue.
Does not exist at runtime; used only for type inference.

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`$value`](FieldBuilder.md#value)

***

### state

> `protected` `readonly` **state**: [`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

Defined in: fields/base.d.ts:119

Internal mutable state of the builder.
Exposed as protected so subclasses can access and extend state.

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`state`](FieldBuilder.md#state)

## Methods

### default()

> **default**(`value`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `Exclude`\<`TValue`, `undefined`\>, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:158

Sets a form-level fallback value (not a database DEFAULT) and excludes
undefined from TValue.

#### Parameters

##### value

`Exclude`\<`TValue`, `undefined`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `Exclude`\<`TValue`, `undefined`\>, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`default`](FieldBuilder.md#default)

***

### description()

> **description**(`description`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:145

Sets help text describing the field's purpose.

#### Parameters

##### description

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`description`](FieldBuilder.md#description)

***

### getState()

> **getState**(): [`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

Defined in: fields/base.d.ts:135

**`Internal`**

Returns builder state without finalizing via `toSchema(name)`; used
internally to compose builders (e.g. `from(column).as(field)`).

#### Returns

[`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`getState`](FieldBuilder.md#getstate)

***

### hidden()

> **hidden**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:164

Hides the field from forms and tables.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`hidden`](FieldBuilder.md#hidden)

***

### label()

> **label**(`label`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:143

Sets the field's display label.

#### Parameters

##### label

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`label`](FieldBuilder.md#label)

***

### max()

> **max**(`length`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/email.d.ts:19

Sets the maximum number of characters allowed.

#### Parameters

##### length

`number`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

***

### meta()

> **meta**(`meta`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:173

Merges adapter-specific metadata into any existing `meta`.

#### Parameters

##### meta

`Record`\<`string`, `unknown`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`meta`](FieldBuilder.md#meta)

***

### min()

> **min**(`length`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/email.d.ts:17

Sets the minimum number of characters allowed.

#### Parameters

##### length

`number`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

***

### nullable()

> **nullable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue` \| `null`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:153

Allows null (TValue | null); also sets required: false.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue` \| `null`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`nullable`](FieldBuilder.md#nullable)

***

### optional()

> **optional**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue` \| `undefined`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:151

Marks the field optional (TValue | undefined); does not allow null.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue` \| `undefined`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`optional`](FieldBuilder.md#optional)

***

### placeholder()

> **placeholder**(`placeholder`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:147

Sets placeholder text for empty form inputs.

#### Parameters

##### placeholder

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`placeholder`](FieldBuilder.md#placeholder)

***

### readOnly()

> **readOnly**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:166

Makes the field display-only in forms.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`readOnly`](FieldBuilder.md#readonly)

***

### required()

> **required**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `NonNullable`\<`TValue`\>, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:149

Marks the field required, narrowing TValue and forcing nullable: false.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `NonNullable`\<`TValue`\>, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`required`](FieldBuilder.md#required)

***

### searchable()

> **searchable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:160

Marks the field searchable in list/table queries.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`searchable`](FieldBuilder.md#searchable)

***

### sortable()

> **sortable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:162

Marks the field sortable in table columns.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`sortable`](FieldBuilder.md#sortable)

***

### toSchema()

> **toSchema**(`name`): [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)

Defined in: fields/base.d.ts:178

Finalizes the builder into a `FieldSchema`.

#### Parameters

##### name

`string`

#### Returns

[`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)

#### Throws

If `name` is empty or whitespace-only.

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`toSchema`](FieldBuilder.md#toschema)

***

### validation()

> **validation**\<`TOutput`\>(`validation`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TOutput`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:171

Attaches a StandardSchema validator (Zod, Valibot, ArkType, etc.); its
output type becomes the new TValue.

#### Type Parameters

##### TOutput

`TOutput` = `TValue`

#### Parameters

##### validation

[`StandardSchemaLike`](../interfaces/StandardSchemaLike.md)\<`unknown`, `TOutput`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TOutput`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`validation`](FieldBuilder.md#validation)

***

### withSource()

> **withSource**(`source`): `this`

Defined in: fields/base.d.ts:141

**`Internal`**

Returns a sourced copy of this builder while preserving the concrete
builder type; used by `from(column).as(field)`.

#### Parameters

##### source

[`FieldSource`](../interfaces/FieldSource.md)

#### Returns

`this`

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`withSource`](FieldBuilder.md#withsource)

***

### withState()

> `protected` **withState**\<`TNextValue`\>(`patch`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TNextValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

Defined in: fields/base.d.ts:129

Creates a new instance of the current concrete builder (via
`this.constructor`) so subclass methods stay available after chaining.

#### Type Parameters

##### TNextValue

`TNextValue` = `TValue`

#### Parameters

##### patch

`Partial`\<`TSchema`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`EmailFieldBuilder`\<`TValue`\>, `TNextValue`, [`EmailFieldSchema`](../interfaces/EmailFieldSchema.md)\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`withState`](FieldBuilder.md#withstate)
