---
sidebar_position: 1
title: Actions
---

# Actions

Actions describe executable workflows that adapters can render as buttons, menu items, toolbar commands, row actions, or bulk operations.

```ts
import { action } from "@verikit/runtime";

type AppContext = {
  currentUser: {
    canApprove: boolean;
  };
  approvals: {
    approve(id: string): Promise<{ id: string; status: "approved" }>;
  };
  posts: {
    publish(id: string): Promise<{ id: string; status: "published" }>;
  };
};

type PostRecord = {
  id: string;
  status?: string;
};

const publish = action("publish")
  .label("Publish")
  .description("Make this record visible")
  .icon("send")
  .variant("primary")
  .availableWhen<AppContext, PostRecord>(() => true)
  .confirmation("Publish this record?")
  .execute(async ({ context, record }) => {
    return context.posts.publish(record.id);
  })
  .result({
    successMessage: "Published",
    errorMessage: "Publish failed",
  });
```

Actions are immutable builders. Each method returns the next builder state.

## Presentation

| Method                      | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `.label(label)`             | Display label.                                      |
| `.description(description)` | Supporting UI copy.                                 |
| `.icon(icon)`               | Adapter-specific icon name.                         |
| `.variant(variant)`         | Visual intent: `primary`, `secondary`, or `danger`. |
| `.meta(meta)`               | Adapter-specific metadata.                          |

## Confirmation

Use a string for the simplest confirmation prompt:

```ts
const deletePost = action("deletePost")
  .variant("danger")
  .confirmation("Delete this post?");
```

Use an object when you need custom copy:

```ts
const archive = action("archive").confirmation({
  title: "Archive post",
  message: "Archive this post?",
  confirmLabel: "Archive",
  cancelLabel: "Cancel",
});
```

## Availability

Use `.availableWhen()` to hide or disable actions based on context, record, or raw input.

```ts
const approve = action("approve")
  .availableWhen<AppContext, PostRecord>(({ context, record }) => {
    if (!context.currentUser.canApprove) {
      return { available: false, reason: "You cannot approve records." };
    }

    return record.status === "pending";
  })
  .execute(async ({ context, record }) => {
    return context.approvals.approve(record.id);
  });
```

Availability guards run before form validation, so `input` is typed as `Record<string, unknown> | undefined`. They can return `boolean` or `{ available, reason }`.

## Schema output

Call `.toSchema()` to get the adapter-facing action schema.

```ts
const schema = publish.toSchema();
```

The schema contains serializable metadata such as `name`, `label`, `description`, `icon`, `variant`, `confirmation`, `form`, string result messages, and `meta`.

Function values such as handlers, hooks, dynamic messages, and availability guards are runtime-only and are not serialized into the action schema.
