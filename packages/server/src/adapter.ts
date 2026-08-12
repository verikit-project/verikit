/**
 * Parameters passed to `ResourceAdapter.list()` for both the list and search routes.
 */
export interface ResourceListParams {
  /** 1-based page number. */
  page: number;
  /** Maximum records to return for this page. */
  pageSize: number;
  /**
   * Free-text search term, present on the search route (and optionally on list).
   */
  search?: string;
  /** Column to sort by and its direction. */
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  /** Server-authored equality constraints. Never populate this from client input. */
  scope?: Record<string, unknown>;
}

/** Result shape returned by `ResourceAdapter.list()`. */
export interface ResourceListResult<TRecord = Record<string, unknown>> {
  records: TRecord[];
  /** Total record count across all pages, for pagination metadata. */
  total: number;
}

/**
 * Storage abstraction a resource is bound to when registered with `createServer()`. Deliberately storage-agnostic: `@verikit/server` never imports an ORM, and `id` is always the raw string path segment an adapter implementation (e.g. `@verikit/drizzle`) owns any coercion to its own key type.
 *
 * Every returned record is an API record, not an ORM row: it must expose a canonical string
 * `id` and only keys declared as resource fields. In particular, an adapter must map storage
 * names back to resource field names and must project away undeclared columns. The server
 * enforces the same allow-list before responding as defence in depth, but adapters must keep
 * this contract for direct callers as well.
 *
 * `TRecord` is always a flat record. Relationships declared on a `Resource` (`belongsTo`/`hasMany`/
 * `belongsToMany`) are schema metadata only: there's no `include`/`select` param on `list`/`find`,
 * no nested-write support on `create`/`update`, and permissions' field redaction only understands
 * top-level keys, not a nested shape. An adapter implementation (present or future, e.g. a Prisma
 * adapter, where nested `include`/`select` is the ORM's own idiom) must not populate relationship
 * values on `TRecord` on its own initiative; doing so would bypass redaction and return a shape
 * `@verikit/core`'s `InferResource<TResource>` type describes for schema-authoring purposes but that
 * this interface, and every handler built on it, doesn't actually support yet. Adding real nested
 * read/write is a deliberate future extension of this contract (request shape, redaction, pagination
 * per relation), not something an individual adapter should imply on its own.
 */
export interface ResourceAdapter<TRecord = Record<string, unknown>> {
  list(params: ResourceListParams): Promise<ResourceListResult<TRecord>>;
  find(
    id: string,
    scope?: Record<string, unknown>,
  ): Promise<TRecord | undefined>;
  create(values: Record<string, unknown>): Promise<TRecord>;
  /**
   * Updates the record with the given id and returns it. `@verikit/server`'s handler already
   * confirmed the record existed and was checked against permissions before calling this, but
   * that check and this call aren't atomic, so the record can still legitimately be gone by the
   * time this runs (a concurrent delete landing in between, or an adapter's own optimistic-
   * concurrency check). Return `undefined` in that case rather than throwing, symmetric with
   * `find`'s own "missing" signal, so the handler can map it to a 404 instead of an opaque 500.
   * An adapter built on a client that throws its own "not found" error here (e.g. Prisma's
   * `P2025`) must catch it and return `undefined` instead of letting it propagate.
   */
  update(
    id: string,
    values: Record<string, unknown>,
    scope?: Record<string, unknown>,
  ): Promise<TRecord | undefined>;
  /**
   * Deletes the record with the given id. Must be idempotent: deleting a record that's already
   * gone (the same existence-check-isn't-atomic race described on `update`) is defined as a
   * no-op success, not an error, matching plain SQL `DELETE`'s own semantics. An adapter built on
   * a client that throws its own "not found" error here (e.g. Prisma's `P2025`) must catch and
   * swallow it rather than letting it propagate.
   */
  delete(id: string, scope?: Record<string, unknown>): Promise<void>;
}
