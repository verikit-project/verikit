import {
  boolean,
  defineResource,
  text,
  textarea,
  type Resource,
} from "@verikit/core";
import type {
  ResourceAdapter,
  ResourceListParams,
  ResourceListResult,
} from "../src/adapter.js";

export interface Post extends Record<string, unknown> {
  id: string;
  title: string;
  body: string;
  published: boolean;
}

/** The resource fixture shared by handler and integration tests. */
export function createPostResource(): Resource {
  return defineResource("post", {
    fields: {
      title: text().required().searchable().sortable(),
      body: textarea(),
      published: boolean().default(false),
    },
  });
}

/**
 * A tiny in-memory `ResourceAdapter` used across the server package's tests.
 */
export function createInMemoryAdapter(
  initial: readonly Post[] = [],
): ResourceAdapter<Post> & { records: Post[] } {
  const records: Post[] = initial.map((post) => ({ ...post }));

  return {
    records,

    async list(params: ResourceListParams): Promise<ResourceListResult<Post>> {
      let filtered = records;

      if (params.scope) {
        filtered = filtered.filter((post) =>
          Object.entries(params.scope!).every(
            ([name, value]) => post[name] === value,
          ),
        );
      }

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
            post.title.toLowerCase().includes(term) ||
            post.body.toLowerCase().includes(term),
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
        (post) =>
          post.id === id &&
          (!scope ||
            Object.entries(scope).every(
              ([name, value]) => post[name] === value,
            )),
      );
    },

    async create(values: Record<string, unknown>): Promise<Post> {
      // A per-instance UUID avoids colliding with an adapter's own seeded
      // ids (a shared module-level counter starting at 1 would collide with
      // a seeded `id: "1"` the moment a test creates a new record).
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
        (post) =>
          post.id === id &&
          (!scope ||
            Object.entries(scope).every(
              ([name, value]) => post[name] === value,
            )),
      );
      if (index === -1) {
        return undefined;
      }
      records[index] = { ...records[index], ...values } as Post;
      return records[index];
    },

    async delete(id: string, scope?: Record<string, unknown>): Promise<void> {
      const index = records.findIndex(
        (post) =>
          post.id === id &&
          (!scope ||
            Object.entries(scope).every(
              ([name, value]) => post[name] === value,
            )),
      );
      if (index !== -1) {
        records.splice(index, 1);
      }
    },
  };
}
