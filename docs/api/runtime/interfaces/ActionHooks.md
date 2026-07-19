[**@verikit/runtime**](../README.md)

***

[@verikit/runtime](../README.md) / ActionHooks

# Interface: ActionHooks\<TContext, TRecord, TInput, TResult\>

Defined in: types/action-hooks.d.ts:3

Hook callbacks around action execution.

## Type Parameters

### TContext

`TContext`

### TRecord

`TRecord`

### TInput

`TInput`

### TResult

`TResult`

## Methods

### after()?

> `optional` **after**(`run`, `result`): `void` \| `Promise`\<`void`\>

Defined in: types/action-hooks.d.ts:5

#### Parameters

##### run

[`ActionRunContext`](ActionRunContext.md)\<`TContext`, `TRecord`, `TInput`\>

##### result

`TResult`

#### Returns

`void` \| `Promise`\<`void`\>

***

### before()?

> `optional` **before**(`run`): `void` \| `Promise`\<`void`\>

Defined in: types/action-hooks.d.ts:4

#### Parameters

##### run

[`ActionRunContext`](ActionRunContext.md)\<`TContext`, `TRecord`, `TInput`\>

#### Returns

`void` \| `Promise`\<`void`\>

***

### error()?

> `optional` **error**(`run`, `error`): `void` \| `Promise`\<`void`\>

Defined in: types/action-hooks.d.ts:6

#### Parameters

##### run

[`ActionRunContext`](ActionRunContext.md)\<`TContext`, `TRecord`, `TInput`\>

##### error

`unknown`

#### Returns

`void` \| `Promise`\<`void`\>
