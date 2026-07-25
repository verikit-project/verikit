[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / VerikitValidationFailure

# Interface: VerikitValidationFailure

Defined in: packages/react/dist/form/submission.d.ts:10

Failed inference or validation result with issues mapped to fields.

## Properties

### fieldErrors

> **fieldErrors**: [`VerikitFieldErrors`](../type-aliases/VerikitFieldErrors.md)

Defined in: packages/react/dist/form/submission.d.ts:18

Issues grouped by field key for UI rendering.

***

### issues

> **issues**: `ValidationIssue`[]

Defined in: packages/react/dist/form/submission.d.ts:16

Validation issues returned by Verikit.

***

### reason

> **reason**: `"validation"` \| `"inference"`

Defined in: packages/react/dist/form/submission.d.ts:14

Stage that produced the failure.

***

### success

> **success**: `false`

Defined in: packages/react/dist/form/submission.d.ts:12

Marks the result as failed.
