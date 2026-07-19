[**@verikit/runtime**](../README.md)

***

[@verikit/runtime](../README.md) / ActionRunFailure

# Type Alias: ActionRunFailure

> **ActionRunFailure** = \{ `message?`: `string`; `reason`: `"unavailable"`; `success`: `false`; \} \| \{ `issues`: `ValidationIssue`[]; `reason`: `"validation"`; `success`: `false`; \} \| \{ `error`: `unknown`; `message?`: `string`; `reason`: `"execution"`; `success`: `false`; \}

Defined in: execution/action-result.d.ts:14

Failed action run result.
