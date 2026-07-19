---
sidebar_position: 4
title: Hooks
---

# Hooks

Hooks run around an action handler. Use them for logging, instrumentation, cache invalidation, auditing, or side effects that should stay outside the main handler.

```ts
const publish = action("publish")
  .execute(async ({ context, record }) => {
    return context.posts.publish(record.id);
  })
  .hooks({
    before: async ({ context, record }) => {
      await context.audit.write("publish.started", record.id);
    },
    after: async ({ context, record }, result) => {
      await context.audit.write("publish.completed", {
        id: record.id,
        result,
      });
    },
    error: async ({ context, record }, error) => {
      await context.audit.write("publish.failed", {
        id: record.id,
        error,
      });
    },
  });
```

## Hook timing

| Hook                 | Runs                                                         |
| -------------------- | ------------------------------------------------------------ |
| `before(run)`        | After availability and input validation, before the handler. |
| `after(run, result)` | After the handler resolves successfully.                     |
| `error(run, error)`  | If the handler throws.                                       |

Hooks can be synchronous or asynchronous.

## Handler errors

When the handler throws, `runAction()` calls the `error` hook and returns an execution failure result.

```ts
{
  success: false,
  reason: "execution",
  error,
  message,
}
```

The original error is preserved in the result.
