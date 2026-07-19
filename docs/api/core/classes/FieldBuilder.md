[**@verikit/core**](../README.md)

***

[@verikit/core](../README.md) / FieldBuilder

# Class: FieldBuilder\<TValue, TSchema\>

Defined in: fields/base.d.ts:109

Immutable fluent builder for field schemas: each modifier method returns a
new builder with updated state and TValue narrowed/widened accordingly.
Call `.toSchema(name)` to finalize into a `FieldSchema`.

## Extended by

- [`DateFieldBuilder`](DateFieldBuilder.md)
- [`DateTimeFieldBuilder`](DateTimeFieldBuilder.md)
- [`EmailFieldBuilder`](EmailFieldBuilder.md)
- [`FileFieldBuilder`](FileFieldBuilder.md)
- [`ImageFieldBuilder`](ImageFieldBuilder.md)
- [`NumberFieldBuilder`](NumberFieldBuilder.md)
- [`SelectFieldBuilder`](SelectFieldBuilder.md)
- [`TextFieldBuilder`](TextFieldBuilder.md)
- [`TextareaFieldBuilder`](TextareaFieldBuilder.md)

## Type Parameters

### TValue

`TValue` = `unknown`

### TSchema

`TSchema` *extends* [`FieldSchema`](../interfaces/FieldSchema.md) = [`FieldSchema`](../interfaces/FieldSchema.md)

## Constructors

### Constructor

> **new FieldBuilder**\<`TValue`, `TSchema`\>(`state`): `FieldBuilder`\<`TValue`, `TSchema`\>

Defined in: fields/base.d.ts:124

Typically constructed via `createField()` or a field-type helper
(`text()`, `select()`, etc.), not directly.

#### Parameters

##### state

[`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

#### Returns

`FieldBuilder`\<`TValue`, `TSchema`\>

## Properties

### $value

> `readonly` **$value**: `TValue`

Defined in: fields/base.d.ts:114

Phantom property used by InferField to extract TValue.
Does not exist at runtime; used only for type inference.

***

### state

> `protected` `readonly` **state**: [`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

Defined in: fields/base.d.ts:119

Internal mutable state of the builder.
Exposed as protected so subclasses can access and extend state.

## Methods

### default()

> **default**(`value`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `Exclude`\<`TValue`, `undefined`\>, `TSchema`\>

Defined in: fields/base.d.ts:158

Sets a form-level fallback value (not a database DEFAULT) and excludes
undefined from TValue.

#### Parameters

##### value

`Exclude`\<`TValue`, `undefined`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `Exclude`\<`TValue`, `undefined`\>, `TSchema`\>

***

### description()

> **description**(`description`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:145

Sets help text describing the field's purpose.

#### Parameters

##### description

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### getState()

> **getState**(): [`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

Defined in: fields/base.d.ts:135

**`Internal`**

Returns builder state without finalizing via `toSchema(name)`; used
internally to compose builders (e.g. `from(column).as(field)`).

#### Returns

[`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

***

### hidden()

> **hidden**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:164

Hides the field from forms and tables.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### label()

> **label**(`label`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:143

Sets the field's display label.

#### Parameters

##### label

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### meta()

> **meta**(`meta`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:173

Merges adapter-specific metadata into any existing `meta`.

#### Parameters

##### meta

`Record`\<`string`, `unknown`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### nullable()

> **nullable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue` \| `null`, `TSchema`\>

Defined in: fields/base.d.ts:153

Allows null (TValue | null); also sets required: false.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue` \| `null`, `TSchema`\>

***

### optional()

> **optional**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue` \| `undefined`, `TSchema`\>

Defined in: fields/base.d.ts:151

Marks the field optional (TValue | undefined); does not allow null.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue` \| `undefined`, `TSchema`\>

***

### placeholder()

> **placeholder**(`placeholder`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:147

Sets placeholder text for empty form inputs.

#### Parameters

##### placeholder

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### readOnly()

> **readOnly**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:166

Makes the field display-only in forms.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### required()

> **required**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `NonNullable`\<`TValue`\>, `TSchema`\>

Defined in: fields/base.d.ts:149

Marks the field required, narrowing TValue and forcing nullable: false.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `NonNullable`\<`TValue`\>, `TSchema`\>

***

### searchable()

> **searchable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:160

Marks the field searchable in list/table queries.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### sortable()

> **sortable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

Defined in: fields/base.d.ts:162

Marks the field sortable in table columns.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TValue`, `TSchema`\>

***

### toSchema()

> **toSchema**(`name`): `TSchema`

Defined in: fields/base.d.ts:178

Finalizes the builder into a `FieldSchema`.

#### Parameters

##### name

`string`

#### Returns

`TSchema`

#### Throws

If `name` is empty or whitespace-only.

***

### validation()

> **validation**\<`TOutput`\>(`validation`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TOutput`, `TSchema`\>

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

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TOutput`, `TSchema`\>

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

***

### withState()

> `protected` **withState**\<`TNextValue`\>(`patch`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TNextValue`, `TSchema`\>

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

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`FieldBuilder`\<`TValue`, `TSchema`\>, `TNextValue`, `TSchema`\>
