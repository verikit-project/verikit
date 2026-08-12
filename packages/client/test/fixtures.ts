import {
  boolean,
  definePermissions,
  defineResource,
  text,
  textarea,
  type Resource,
} from "@verikit/core";
import { action } from "@verikit/runtime";
import {
  createServer,
  type ResourceAdapter,
  type ResourceListParams,
  type ResourceListResult,
} from "@verikit/server";

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

/** Whether `post` matches every key/value pair in `scope` (vacuously true when `scope` is unset). */
function matchesScope(
  post: Post,
  scope: Record<string, unknown> | undefined,
): boolean {
  return (
    !scope ||
    Object.entries(scope).every(([name, value]) => post[name] === value)
  );
}

/**
 * A tiny in-memory `ResourceAdapter`, mirroring `@verikit/server`'s own test fixture
 * (including its `scope`/`filters` enforcement, so client tests exercising access control
 * or structured filtering see the same behavior a real adapter would).
 */
export function createInMemoryAdapter(
  initial: readonly Post[] = [],
): ResourceAdapter<Post> {
  const records: Post[] = initial.map((post) => ({ ...post }));

  return {
    async list(params: ResourceListParams): Promise<ResourceListResult<Post>> {
      let filtered = records.filter((post) => matchesScope(post, params.scope));

      if (params.filters) {
        filtered = filtered.filter((post) =>
          Object.entries(params.filters!).every(([name, filter]) => {
            const value = post[name];
            return (
              (filter.eq === undefined || value === filter.eq) &&
              (filter.gte === undefined || value! >= filter.gte) &&
              (filter.gt === undefined || value! > filter.gt) &&
              (filter.lte === undefined || value! <= filter.lte) &&
              (filter.lt === undefined || value! < filter.lt)
            );
          }),
        );
      }

      if (params.search) {
        const term = params.search.toLowerCase();
        filtered = filtered.filter(
          (post) =>
            params.searchFields?.includes("title") !== false &&
            post.title.toLowerCase().includes(term),
        );
      }

      if (params.sort) {
        const { field, direction } = params.sort;
        filtered = [...filtered].sort((a, b) => {
          const left = a[field];
          const right = b[field];
          const compared = left! < right! ? -1 : left! > right! ? 1 : 0;
          return direction === "desc" ? -compared : compared;
        });
      }

      const start = (params.page - 1) * params.pageSize;
      return {
        records: filtered.slice(start, start + params.pageSize),
        total: filtered.length,
      };
    },

    async find(
      id: string,
      scope?: Record<string, unknown>,
    ): Promise<Post | undefined> {
      return records.find(
        (post) => post.id === id && matchesScope(post, scope),
      );
    },

    async create(values: Record<string, unknown>): Promise<Post> {
      const post: Post = {
        id: crypto.randomUUID(),
        title: "",
        body: "",
        published: false,
        ...values,
      };
      records.push(post);
      return post;
    },

    async update(
      id: string,
      values: Record<string, unknown>,
      scope?: Record<string, unknown>,
    ): Promise<Post | undefined> {
      const index = records.findIndex(
        (post) => post.id === id && matchesScope(post, scope),
      );
      if (index === -1) {
        return undefined;
      }
      records[index] = { ...records[index], ...values } as Post;
      return records[index];
    },

    async delete(id: string, scope?: Record<string, unknown>): Promise<void> {
      const index = records.findIndex(
        (post) => post.id === id && matchesScope(post, scope),
      );
      if (index !== -1) {
        records.splice(index, 1);
      }
    },
  };
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
