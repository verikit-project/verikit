[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / ActionRunFailure

# Type Alias: ActionRunFailure

> **ActionRunFailure** = \{ `message?`: `string`; `reason`: `"forbidden"`; `success`: `false`; \} \| \{ `message?`: `string`; `reason`: `"unavailable"`; `success`: `false`; \} \| \{ `message?`: `string`; `reason`: `"confirmation"`; `success`: `false`; \} \| \{ `issues`: `ValidationIssue`[]; `reason`: `"validation"`; `success`: `false`; \} \| \{ `error`: `unknown`; `message?`: `string`; `reason`: `"execution"`; `success`: `false`; \}

Defined in: actions/execution/action-result.d.ts:14

Failed action run result.
