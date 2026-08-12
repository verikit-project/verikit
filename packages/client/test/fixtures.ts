import {
  boolean,
  definePermissions,
  defineResource,
  text,
  textarea,
  type Resource,
} from "@verikit/core";
import { action } from "@verikit/runtime";
import { createServer, type ResourceAdapter } from "@verikit/server";
import { createInMemoryAdapter as createSharedInMemoryAdapter } from "@verikit/server/testing";

export interface Post extends Record<string, unknown> {
  id: string;
  title: string;
  body: string;
  published: boolean;
}

interface Actor {
  role: "admin" | "viewer";
}

/**
 * The resource fixture shared by the client's unit and integration tests.
 */
export function createPostResource(): Resource {
  return defineResource("post", {
    fields: {
      title: text().required().searchable(),
      body: textarea(),
      published: boolean().default(false),
    },
  });
}

/**
 * A tiny in-memory `ResourceAdapter`, sharing `@verikit/server`'s own in-memory adapter
 * implementation (including its `scope`/`filters`/`search` enforcement) so client tests
 * exercising access control or structured filtering see the same behavior a real adapter would.
 */
export function createInMemoryAdapter(
  initial: readonly Post[] = [],
): ResourceAdapter<Post> {
  return createSharedInMemoryAdapter(initial, {
    searchableFields: ["title"],
    createDefaults: () => ({ title: "", body: "", published: false }),
  });
}

/**
 * Wires a real `createServer()` handler (post resource + in-memory adapter + a role-gated `publish` action that requires confirmation) and returns it as a `typeof fetch`, so the client under test can be pointed at a real server contract instead of hand-rolled mock responses.
 */
export function createTestServerFetch(initial: readonly Post[] = []): {
  fetch: typeof fetch;
  adapter: ResourceAdapter<Post>;
} {
  const adapter = createInMemoryAdapter(initial);

  // Permissions are fail-closed: every operation without an explicit rule is denied,
  // so CRUD reads/creates/updates must be allowed explicitly even though this
  // fixture's real goal is gating `delete` and the `publish` action to admins (to exercise 403/404/409 paths from the client).
  const permissions = definePermissions<Actor>()
    .can("create", () => true)
    .can("list", () => true)
    .can("read", () => true)
    .can("update", () => true)
    .can("delete", ({ actor }) => actor.role === "admin")
    .field("title", { read: () => true, write: () => true })
    .field("body", { read: () => true, write: () => true })
    .field("published", { read: () => true, write: () => true })
    .action("publish", ({ actor }) => actor.role === "admin");

  const publish = action("publish")
    .permissions(permissions)
    .confirmation("Publish this post?")
    .execute(async ({ record }) => {
      const post = record as Post;
      return { id: post.id, published: true };
    });

  const handler = createServer<Actor>({
    basePath: "/api",
    resources: [
      {
        resource: createPostResource(),
        adapter,
        actions: [publish],
        permissions,
      },
    ],
    context: (request) => ({
      role: request.headers.get("x-role") === "admin" ? "admin" : "viewer",
    }),
  });

  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
    handler(new Request(input, init))) as typeof fetch;

  return { fetch: fetchImpl, adapter };
}
