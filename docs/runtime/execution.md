---
sidebar_position: 3
title: Execution
---

# Execution

Use `runAction()` to execute an action with availability checks, input validation, handler execution, result messages, and lifecycle hooks.

```ts
import { runAction } from "@verikit/runtime";

const result = await runAction(publish, {
  context: {
    posts,
    currentUser,
  },
  record: {
    id: "post_123",
    status: "draft",
  },
  input: {},
});
```

## Execution order

`runAction()` performs these steps:

1. Run the availability guard, if one is defined, with raw input.
2. Validate action form input, if a form is defined.
3. Throw if the action has no handler.
4. Run the `before` hook, if defined.
5. Execute the handler.
6. Run the `after` hook after a successful handler.
7. Run the `error` hook if the handler throws.
8. Return a success, unavailable, validation, or execution result.

## Request shape

```ts
type ActionRunRequest<TContext, TRecord> = {
  context: TContext;
  record?: TRecord;
  input?: Record<string, unknown>;
};
```

`context` is application-defined. Use it for services, database clients, auth state, config, and other runtime dependencies.

`record` is optional so actions can be global, collection-level, row-level, or detail-page commands.

`input` contains raw action form values. Availability guards receive this raw input, then Verikit validates it before handlers and lifecycle hooks receive it.

## Result shape

Successful runs return:

```ts
{
  success: true,
  result,
  message,
}
```

Unavailable actions return:

```ts
{
  success: false,
  reason: "unavailable",
  message,
}
```

Validation failures return:

```ts
{
  success: false,
  reason: "validation",
  issues,
}
```

Execution failures return:

```ts
{
  success: false,
  reason: "execution",
  error,
  message,
}
```

## Result messages

Use `.result()` to define success and error messages.

```ts
const save = action("save")
  .execute(async ({ context, record }) => {
    return context.posts.save(record);
  })
  .result({
    successMessage: (post) => `Saved ${post.title}`,
    errorMessage: () => "Could not save post.",
  });
```

String result messages are included in `.toSchema()`. Function messages are evaluated only at runtime.
