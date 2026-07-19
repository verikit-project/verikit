[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / SelectFieldBuilder

# Class: SelectFieldBuilder\<TValue\>

Defined in: [fields/select.ts:16](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/select.ts#L16)

Fluent builder for select fields.

## Extends

- [`FieldBuilder`](FieldBuilder.md)\<`TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

## Type Parameters

### TValue

`TValue` _extends_ [`OptionValue`](../type-aliases/OptionValue.md) = [`OptionValue`](../type-aliases/OptionValue.md)

## Constructors

### Constructor

> **new SelectFieldBuilder**\<`TValue`>>>\>(`state?`): `SelectFieldBuilder`\<`TValue`>>>\>

Defined in: [fields/select.ts:19](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/select.ts#L19)

#### Parameters

##### state?

`Omit`\<[`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>, `"type"` \| `"name"`\> = `...`

#### Returns

`SelectFieldBuilder`\<`TValue`\>

#### Overrides

[`FieldBuilder`](FieldBuilder.md).[`constructor`](FieldBuilder.md#constructor)

## Properties

### $value

> `readonly` **$value**: `TValue` \| `null` \| `undefined`

Defined in: [fields/base.ts:171](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L171)

Phantom property used by InferField to extract TValue.
Does not exist at runtime; used only for type inference.

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`$value`](FieldBuilder.md#value)

---

### state

> `protected` `readonly` **state**: [`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`>>>\>

Defined in: [fields/base.ts:177](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L177)

Internal mutable state of the builder.
Exposed as protected so subclasses can access and extend state.

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`state`](FieldBuilder.md#state)

## Methods

### default()

> **default**(`value`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `Exclude`\<`TValue`, `undefined`> > > \> \| `null`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:271](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L271)

Sets a form-level fallback value (not a database DEFAULT) and excludes
undefined from TValue.

#### Parameters

##### value

`Exclude`\<`TValue`, `undefined`\> \| `null`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `Exclude`\<`TValue`, `undefined`\> \| `null`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`default`](FieldBuilder.md#default)

---

### description()

> **description**(`description`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:230](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L230)

Sets help text describing the field's purpose.

#### Parameters

##### description

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`description`](FieldBuilder.md#description)

---

### getState()

> **getState**(): [`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`>>>\>

Defined in: [fields/base.ts:211](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L211)

**`Internal`**

Returns builder state without finalizing via `toSchema(name)`; used
internally to compose builders (e.g. `from(column).as(field)`).

#### Returns

[`FieldBuilderState`](../type-aliases/FieldBuilderState.md)\<`TSchema`\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`getState`](FieldBuilder.md#getstate)

---

### hidden()

> **hidden**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:290](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L290)

Hides the field from forms and tables.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`hidden`](FieldBuilder.md#hidden)

---

### label()

> **label**(`label`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:225](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L225)

Sets the field's display label.

#### Parameters

##### label

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`label`](FieldBuilder.md#label)

---

### meta()

> **meta**(`meta`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:310](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L310)

Merges adapter-specific metadata into any existing `meta`.

#### Parameters

##### meta

`Record`\<`string`, `unknown`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`meta`](FieldBuilder.md#meta)

---

### nullable()

> **nullable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:260](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L260)

Allows null (TValue | null); also sets required: false.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`nullable`](FieldBuilder.md#nullable)

---

### optional()

> **optional**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:252](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L252)

Marks the field optional (TValue | undefined); does not allow null.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`optional`](FieldBuilder.md#optional)

---

### options()

#### Call Signature

> **options**\<`TOptions`>>>\>(`options`): [`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\] \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TOptions`\[`number`\]\>\>

Defined in: [fields/select.ts:30](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/select.ts#L30)

Set select options from primitive values.

##### Type Parameters

###### TOptions

`TOptions` _extends_ readonly `TValue`[]

##### Parameters

###### options

`TOptions`

##### Returns

[`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\] \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TOptions`\[`number`\]\>\>

#### Call Signature

> **options**\<`TOptions`>>>\>(`options`): [`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\]\[`"value"`\] \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TOptions`\[`number`\]\[`"value"`\]\>\>

Defined in: [fields/select.ts:39](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/select.ts#L39)

Set select options from labelled option objects.

##### Type Parameters

###### TOptions

`TOptions` _extends_ readonly [`FieldOption`](../interfaces/FieldOption.md)\<`TValue`\>[]

##### Parameters

###### options

`TOptions`

##### Returns

[`FieldBuilder`](FieldBuilder.md)\<`TOptions`\[`number`\]\[`"value"`\] \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TOptions`\[`number`\]\[`"value"`\]\>\>

---

### placeholder()

> **placeholder**(`placeholder`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:237](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L237)

Sets placeholder text for empty form inputs.

#### Parameters

##### placeholder

`string`

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`placeholder`](FieldBuilder.md#placeholder)

---

### readOnly()

> **readOnly**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:295](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L295)

Makes the field display-only in forms.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`readOnly`](FieldBuilder.md#readonly)

---

### required()

> **required**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:244](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L244)

Marks the field required, narrowing TValue and forcing nullable: false.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`required`](FieldBuilder.md#required)

---

### searchable()

> **searchable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:280](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L280)

Marks the field searchable in list/table queries.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`searchable`](FieldBuilder.md#searchable)

---

### sortable()

> **sortable**(): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:285](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L285)

Marks the field sortable in table columns.

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TValue` \| `null` \| `undefined`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`sortable`](FieldBuilder.md#sortable)

---

### toSchema()

> **toSchema**(`name`): [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)

Defined in: [fields/base.ts:325](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L325)

Finalizes the builder into a `FieldSchema`.

#### Parameters

##### name

`string`

#### Returns

[`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)

#### Throws

If `name` is empty or whitespace-only.

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`toSchema`](FieldBuilder.md#toschema)

---

### validation()

> **validation**\<`TOutput`>>>\>(`validation`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TOutput`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:303](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L303)

Attaches a StandardSchema validator (Zod, Valibot, ArkType, etc.); its
output type becomes the new TValue.

#### Type Parameters

##### TOutput

`TOutput` = `TValue` \| `null` \| `undefined`

#### Parameters

##### validation

[`StandardSchemaLike`](../interfaces/StandardSchemaLike.md)\<`unknown`, `TOutput`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TOutput`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`validation`](FieldBuilder.md#validation)

---

### withSource()

> **withSource**(`source`): `this`

Defined in: [fields/base.ts:220](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L220)

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

---

### withState()

> `protected` **withState**\<`TNextValue`>>>\>(`patch`): [`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`>>>\>, `TNextValue`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`>>>>>>\>\>

Defined in: [fields/base.ts:191](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/fields/base.ts#L191)

Creates a new instance of the current concrete builder (via
`this.constructor`) so subclass methods stay available after chaining.

#### Type Parameters

##### TNextValue

`TNextValue` = `TValue` \| `null` \| `undefined`

#### Parameters

##### patch

`Partial`\<`TSchema`\>

#### Returns

[`FieldBuilderWithValue`](../type-aliases/FieldBuilderWithValue.md)\<`SelectFieldBuilder`\<`TValue`\>, `TNextValue`, [`SelectFieldSchema`](../interfaces/SelectFieldSchema.md)\<`TValue`\>\>

#### Inherited from

[`FieldBuilder`](FieldBuilder.md).[`withState`](FieldBuilder.md#withstate)
