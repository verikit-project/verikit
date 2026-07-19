[**@verikit/core**](../README.md)

---

[@verikit/core](../README.md) / ValidationResult

# Type Alias: ValidationResult\<TValue\>

> **ValidationResult**\<`TValue`> > > \> = \{ `success`: `true`; `value`: `TValue`; \} \| \{ `issues`: [`ValidationIssue`](../interfaces/ValidationIssue.md)[]; `success`: `false`; \}

Defined in: [types/validation.ts:16](https://github.com/iamceeso/verikit/blob/b02d6adb19170825b6578c0db30e2917049e5aff/packages/core/src/types/validation.ts#L16)

Result of running a validator. On success, `value` is the (possibly
transformed, e.g. via `.validation()`) output. On failure, `issues`
contains every collected problem.

## Type Parameters

### TValue

`TValue` = `unknown`
