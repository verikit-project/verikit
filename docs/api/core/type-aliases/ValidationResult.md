[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / ValidationResult

# Type Alias: ValidationResult\<TValue\>

> **ValidationResult**\<`TValue`\> = \{ `success`: `true`; `value`: `TValue`; \} \| \{ `issues`: [`ValidationIssue`](../interfaces/ValidationIssue.md)[]; `success`: `false`; \}

Defined in: types/validation.d.ts:15

Result of running a validator. On success, `value` is the (possibly
transformed, e.g. via `.validation()`) output. On failure, `issues`
contains every collected problem.

## Type Parameters

### TValue

`TValue` = `unknown`
