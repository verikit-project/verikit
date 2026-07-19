[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / ActionBuilder

# Class: ActionBuilder\<TName, TForm, TContext, TRecord, TResult\>

Defined in: builders/action-builder.d.ts:26

Immutable runtime action builder.

The builder covers identity, presentation, availability, confirmation,
optional form input, execution, result metadata, and lifecycle hooks.

## Type Parameters

### TName

`TName` *extends* `string`

### TForm

`TForm` *extends* [`ActionFormMap`](../type-aliases/ActionFormMap.md) = `Record`\<`never`, `never`\>

### TContext

`TContext` = `unknown`

### TRecord

`TRecord` = `unknown`

### TResult

`TResult` = `unknown`

## Constructors

### Constructor

> **new ActionBuilder**\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>(`name`, `state?`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:29

#### Parameters

##### name

`TName`

##### state?

[`ActionState`](../interfaces/ActionState.md)\<`TContext`, `TRecord`, [`InferActionForm`](../type-aliases/InferActionForm.md)\<`TForm`\>, `TResult`\>

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

## Properties

### name

> `readonly` **name**: `TName`

Defined in: builders/action-builder.d.ts:27

## Methods

### availableWhen()

> **availableWhen**\<`TNextContext`, `TNextRecord`\>(`isAvailable`): `ActionBuilder`\<`TName`, `TForm`, `TNextContext`, `TNextRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:42

Adds a runtime availability guard.

#### Type Parameters

##### TNextContext

`TNextContext` = `TContext`

##### TNextRecord

`TNextRecord` = `TRecord`

#### Parameters

##### isAvailable

((`run`) => [`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md) \| `Promise`\<[`ActionAvailabilityResult`](../type-aliases/ActionAvailabilityResult.md)\>) \| `undefined`

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TNextContext`, `TNextRecord`, `TResult`\>

***

### confirmation()

> **confirmation**(`confirmation`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:44

Requires confirmation before adapters execute the action.

#### Parameters

##### confirmation

`string` \| [`ActionConfirmation`](../interfaces/ActionConfirmation.md)

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

***

### description()

> **description**(`description`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:34

Sets supporting UI copy.

#### Parameters

##### description

`string`

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

***

### execute()

> **execute**\<`TNextResult`\>(`handler`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TNextResult`\>

Defined in: builders/action-builder.d.ts:48

Attaches the function that performs the action.

#### Type Parameters

##### TNextResult

`TNextResult`

#### Parameters

##### handler

[`ActionHandler`](../type-aliases/ActionHandler.md)\<`TContext`, `TRecord`, [`InferActionForm`](../type-aliases/InferActionForm.md)\<`TForm`\>, `TNextResult`\>

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TNextResult`\>

***

### form()

> **form**\<`TNextForm`\>(`form`): `ActionBuilder`\<`TName`, `TNextForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:46

Attaches optional form fields that are validated before execution.

#### Type Parameters

##### TNextForm

`TNextForm` *extends* [`ActionFormMap`](../type-aliases/ActionFormMap.md)

#### Parameters

##### form

`TNextForm`

#### Returns

`ActionBuilder`\<`TName`, `TNextForm`, `TContext`, `TRecord`, `TResult`\>

***

### getRuntime()

> **getRuntime**(): [`ActionState`](../interfaces/ActionState.md)\<`TContext`, `TRecord`, [`InferActionForm`](../type-aliases/InferActionForm.md)\<`TForm`\>, `TResult`\>

Defined in: builders/action-builder.d.ts:56

**`Internal`**

Used by `runAction()`.

#### Returns

[`ActionState`](../interfaces/ActionState.md)\<`TContext`, `TRecord`, [`InferActionForm`](../type-aliases/InferActionForm.md)\<`TForm`\>, `TResult`\>

***

### hooks()

> **hooks**(`hooks`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:52

Attaches lifecycle hooks around execution.

#### Parameters

##### hooks

[`ActionHooks`](../interfaces/ActionHooks.md)\<`TContext`, `TRecord`, [`InferActionForm`](../type-aliases/InferActionForm.md)\<`TForm`\>, `TResult`\>

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

***

### icon()

> **icon**(`icon`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:36

Sets an adapter-specific icon name.

#### Parameters

##### icon

`string`

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

***

### label()

> **label**(`label`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:32

Sets the display label.

#### Parameters

##### label

`string`

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

***

### meta()

> **meta**(`meta`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:40

Merges adapter-specific presentation metadata.

#### Parameters

##### meta

`Record`\<`string`, `unknown`\>

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

***

### result()

> **result**(`result`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:50

Sets result presentation metadata.

#### Parameters

##### result

[`ActionResultOptions`](../interfaces/ActionResultOptions.md)\<`TResult`\>

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

***

### toSchema()

> **toSchema**(): [`ActionSchema`](../interfaces/ActionSchema.md)\<`TName`\>

Defined in: builders/action-builder.d.ts:54

Finalizes the adapter-facing action schema.

#### Returns

[`ActionSchema`](../interfaces/ActionSchema.md)\<`TName`\>

***

### variant()

> **variant**(`variant`): `ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>

Defined in: builders/action-builder.d.ts:38

Sets the visual intent.

#### Parameters

##### variant

`"primary"` \| `"secondary"` \| `"danger"` \| `undefined`

#### Returns

`ActionBuilder`\<`TName`, `TForm`, `TContext`, `TRecord`, `TResult`\>
