---
sidebar_position: 2
title: Action Forms
---

# Action Forms

Actions can collect input before execution. Action forms use the same field builders as resources.

```ts
import { textarea } from "@verikit/core";
import { action } from "@verikit/runtime";

type AppContext = {
  reviews: {
    reject(
      id: string,
      reason: string,
    ): Promise<{ id: string; status: "rejected" }>;
  };
};

type PostRecord = {
  id: string;
};

const reject = action("reject")
  .label("Reject")
  .variant("danger")
  .availableWhen<AppContext, PostRecord>(() => true)
  .form({
    reason: textarea().required().min(10),
  })
  .execute(async ({ context, record, input }) => {
    return context.reviews.reject(record.id, input.reason);
  });
```

## Type inference

The action input type is inferred from the form fields.

```ts
import type { InferActionInput } from "@verikit/runtime";

type RejectInput = InferActionInput<typeof reject>;
// { reason: string }
```

Required, optional, nullable, default, and custom validation modifiers affect the inferred input value type in the same way they do for resource fields.

## Validation

`runAction()` validates action form input before calling the handler.

```ts
const result = await runAction(reject, {
  context,
  record,
  input: {
    reason: "Not enough detail.",
  },
});
```

If validation fails, the handler is not called and the result has `reason: "validation"`.

```ts
{
  success: false,
  reason: "validation",
  issues: [
    { path: ["reason"], message: "Must be at least 10 characters." }
  ]
}
```

## Adapter rendering

Action form fields are finalized into ordinary field schemas in `action.toSchema().form`.

That means adapters can use the same field-rendering code for resource forms and action forms.
