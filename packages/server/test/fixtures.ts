import {
  boolean,
  defineResource,
  text,
  textarea,
  type Resource,
} from "@verikit/core";
import type { ResourceAdapter } from "../src/adapter.js";
import { createInMemoryAdapter as createSharedInMemoryAdapter } from "../src/testing/in-memory-adapter.js";

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
      body: textarea().searchable(),
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
  return createSharedInMemoryAdapter(initial, {
    searchableFields: ["title", "body"],
    createDefaults: () => ({ title: "", body: "", published: false }),
  });
}
