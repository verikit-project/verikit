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
  find(id: string): Promise<TRecord | undefined>;
  create(values: Record<string, unknown>): Promise<TRecord>;
  update(id: string, values: Record<string, unknown>): Promise<TRecord>;
  delete(id: string): Promise<void>;
}
