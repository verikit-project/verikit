import assert from "node:assert/strict";
import {
  boolean,
  defineResource,
  text,
  textarea,
  VerikitError,
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

/**
 * Matches a rejected `VerikitError` by status and code. `extra` asserts additional properties
 * (e.g. a `ValidationError`'s `.issues`)  typed as `T` since the base `instanceof` check can't
 * itself narrow to a specific subclass, so callers pass the subclass they expect.
 */
export function verikitError<T extends VerikitError = VerikitError>(
  status: number,
  code?: string,
  extra?: (error: T) => void,
): (error: unknown) => boolean {
  return (error) => {
    assert.ok(error instanceof VerikitError, "expected a VerikitError");
    assert.equal(error.status, status);
    if (code !== undefined) {
      assert.equal(error.code, code);
    }
    extra?.(error as T);
    return true;
  };
}
