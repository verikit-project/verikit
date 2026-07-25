[**@verikit/runtime**](../runtime.md)

***

[@verikit/runtime](../runtime.md) / inferField

# Function: inferField()

> **inferField**(`schema`, `rawValue`): `ValidationResult`

Defined in: infer/infer-field.d.ts:7

Converts a raw value into the runtime type expected by a field schema.
Empty strings are normalized to `undefined`. Validation is performed
separately by `validateField`.

## Parameters

### schema

`FieldSchema`

### rawValue

`unknown`

## Returns

`ValidationResult`
