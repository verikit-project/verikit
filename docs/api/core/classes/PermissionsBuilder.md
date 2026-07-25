[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / PermissionsBuilder

# Class: PermissionsBuilder\<TActor, TRecord, TFieldName, TActionName\>

Defined in: permissions/permissions-builder.d.ts:22

Immutable fluent builder describing CRUD-level operations,
per-field read/write access, and named runtime actions.

This builder only assembles rules; it does not evaluate them. Evaluating a
rule against a `PermissionContext` (and wiring that into `validateResource`
or `runAction`) is left to a runtime helper.

## Type Parameters

### TActor

`TActor` = `unknown`

### TRecord

`TRecord` = `unknown`

### TFieldName

`TFieldName` *extends* `string` = `string`

### TActionName

`TActionName` *extends* `string` = `string`

## Constructors

### Constructor

> **new PermissionsBuilder**\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>(`state?`, `constraints?`): `PermissionsBuilder`\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>

Defined in: permissions/permissions-builder.d.ts:25

#### Parameters

##### state?

[`PermissionsState`](../interfaces/PermissionsState.md)\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>

##### constraints?

[`PermissionNameConstraints`](../interfaces/PermissionNameConstraints.md)\<`TFieldName`, `TActionName`\>

#### Returns

`PermissionsBuilder`\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>

## Methods

### action()

> **action**(`name`, `rule`): `this`

Defined in: permissions/permissions-builder.d.ts:35

Gates whether a named runtime action may run.

#### Parameters

##### name

`TActionName`

##### rule

[`PermissionRuleInput`](../type-aliases/PermissionRuleInput.md)\<`TActor`, `TRecord`\>

#### Returns

`this`

***

### can()

> **can**(`operation`, `rule`): `this`

Defined in: permissions/permissions-builder.d.ts:28

Gates a resource-level CRUD operation.

#### Parameters

##### operation

[`ResourceOperation`](../type-aliases/ResourceOperation.md)

##### rule

[`PermissionRuleInput`](../type-aliases/PermissionRuleInput.md)\<`TActor`, `TRecord`\>

#### Returns

`this`

***

### field()

> **field**(`name`, `access`): `this`

Defined in: permissions/permissions-builder.d.ts:30

Gates read and/or write access to a named field.

#### Parameters

##### name

`TFieldName`

##### access

###### read?

[`PermissionRuleInput`](../type-aliases/PermissionRuleInput.md)\<`TActor`, `TRecord`\>

###### write?

[`PermissionRuleInput`](../type-aliases/PermissionRuleInput.md)\<`TActor`, `TRecord`\>

#### Returns

`this`

***

### getRuntime()

> **getRuntime**(): [`PermissionsState`](../interfaces/PermissionsState.md)\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>

Defined in: permissions/permissions-builder.d.ts:37

**`Internal`**

Used by a future runtime evaluator.

#### Returns

[`PermissionsState`](../interfaces/PermissionsState.md)\<`TActor`, `TRecord`, `TFieldName`, `TActionName`\>
