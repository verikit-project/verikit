[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / CompileIssue

# Interface: CompileIssue

Defined in: compiler/compile.d.ts:3

A single problem found while compiling a set of resources against each other.

## Properties

### message

> **message**: `string`

Defined in: compiler/compile.d.ts:8

***

### relationship?

> `optional` **relationship?**: `string`

Defined in: compiler/compile.d.ts:7

Name of the offending relationship, if the issue is relationship-scoped.

***

### resource

> **resource**: `string`

Defined in: compiler/compile.d.ts:5

Name of the resource whose declaration needs fixing.
