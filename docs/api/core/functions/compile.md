[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / compile

# Function: compile()

> **compile**(`resources`): [`CompileResult`](../type-aliases/CompileResult.md)

Defined in: compiler/compile.d.ts:29

Compiles a set of resources together, cross-checking each relationship's
target resource, foreign key field, and (for belongsToMany) through
resource against the other resources in the same set. Each resource is
already valid on its own via `.toSchema()`; this only catches problems
that only exist once resources are considered together.

## Parameters

### resources

readonly [`Resource`](../classes/Resource.md)\<`string`, [`FieldMap`](../type-aliases/FieldMap.md), `unknown`, [`RelationshipMap`](../type-aliases/RelationshipMap.md)\>[]

## Returns

[`CompileResult`](../type-aliases/CompileResult.md)
