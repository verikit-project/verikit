---
sidebar_position: 2
title: Admin Actions
---

# Admin Actions

This example defines publish, archive, and reject actions for an admin interface.

```ts
import { textarea } from "@verikit/core";
import { action, runAction } from "@verikit/runtime";

type AdminContext = {
  currentUser: {
    id: string;
    canPublish: boolean;
  };
  posts: {
    publish(id: string): Promise<{ id: string; status: "published" }>;
    archive(id: string): Promise<{ id: string; status: "archived" }>;
    reject(
      id: string,
      reason: string,
    ): Promise<{ id: string; status: "rejected" }>;
  };
  audit: {
    write(event: string, payload: unknown): Promise<void>;
  };
};

type PostRecord = {
  id: string;
  status: "draft" | "review" | "published" | "archived" | "rejected";
};

export const publishPost = action("publishPost")
  .label("Publish")
  .icon("send")
  .variant("primary")
  .availableWhen<AdminContext, PostRecord>(({ context, record }) => {
    if (!context.currentUser.canPublish) {
      return { available: false, reason: "You cannot publish posts." };
    }

    return record?.status === "review";
  })
  .confirmation("Publish this post?")
  .execute(async ({ context, record }) => {
    return context.posts.publish(record.id);
  })
  .result({
    successMessage: "Post published.",
    errorMessage: "Could not publish post.",
  });

export const archivePost = action("archivePost")
  .label("Archive")
  .variant("secondary")
  .availableWhen<AdminContext, PostRecord>(({ record }) => {
    return record?.status === "published";
  })
  .confirmation({
    title: "Archive post",
    message: "Archive this post?",
    confirmLabel: "Archive",
  })
  .execute(async ({ context, record }) => {
    return context.posts.archive(record.id);
  });

export const rejectPost = action("rejectPost")
  .label("Reject")
  .variant("danger")
  .availableWhen<AdminContext, PostRecord>(({ record }) => {
    return record?.status === "review";
  })
  .form({
    reason: textarea().required().min(10),
  })
  .execute(async ({ context, record, input }) => {
    return context.posts.reject(record.id, input.reason);
  })
  .hooks({
    after: async ({ context, record }, result) => {
      await context.audit.write("post.rejected", {
        id: record.id,
        result,
      });
    },
  });
```

## Running an action

```ts
const result = await runAction(rejectPost, {
  context,
  record: {
    id: "post_123",
    status: "review",
  },
  input: {
    reason: "The draft needs stronger citations.",
  },
});
```

Use `.toSchema()` when the adapter only needs presentation and form metadata:

```ts
const actionSchemas = [
  publishPost.toSchema(),
  archivePost.toSchema(),
  rejectPost.toSchema(),
];
```
