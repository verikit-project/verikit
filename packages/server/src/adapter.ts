/** Parameters passed to `ResourceAdapter.list()` for both the list and search routes. */
export interface ResourceListParams {
  /** 1-based page number. */
  page: number;
  /** Maximum records to return for this page. */
  pageSize: number;
  /** Free-text search term, present on the search route (and optionally on list). */
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
 * Storage abstraction a resource is bound to when registered with
 * `createServer()`. Deliberately storage-agnostic: `@verikit/server` never
 * imports an ORM, and `id` is always the raw string path segment — an
 * adapter implementation (e.g. a future `@verikit/drizzle`) owns any
 * coercion to its own key type.
 */
export interface ResourceAdapter<TRecord = Record<string, unknown>> {
  list(params: ResourceListParams): Promise<ResourceListResult<TRecord>>;
  find(id: string): Promise<TRecord | undefined>;
  create(values: Record<string, unknown>): Promise<TRecord>;
  update(id: string, values: Record<string, unknown>): Promise<TRecord>;
  delete(id: string): Promise<void>;
}
