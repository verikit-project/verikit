/**
 * A validation issue as serialized by `@verikit/server`'s error envelope.
 */
export interface ValidationIssueLike {
  path: (string | number)[];
  message: string;
}

/**
 * Resolved fresh before every request, so e.g. a refreshed auth token is picked up.
 */
export type HeadersSource =
  HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

export interface ClientOptions {
  /**
   * Prefix every resource path is built under, e.g. `"/api"` or `"https://api.example.com"`.
   */
  baseUrl: string;
  /** Static headers, or a function re-resolved before every request. */
  headers?: HeadersSource;
  /**
   * Overrides the Fetch implementation used to send requests; defaults to the global `fetch`.
   */
  fetch?: typeof fetch;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: { field: string; direction?: "asc" | "desc" };
  filters?: Record<
    string,
    {
      eq?: string | number | boolean | null;
      gte?: string | number;
      gt?: string | number;
      lte?: string | number;
      lt?: string | number;
    }
  >;
}

export interface ListResponse<TRecord> {
  records: TRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface ActionOptions extends RequestOptions {
  /** Id of the record the action is scoped to, if any. */
  recordId?: string;
  /** Set once the caller has confirmed a `confirmationRequired` response. */
  confirmed?: boolean;
}

export interface ActionResult<TResult> {
  result: TResult;
  message?: string;
}

export interface ResourceClient<TRecord = Record<string, unknown>> {
  list(
    params?: ListParams,
    options?: RequestOptions,
  ): Promise<ListResponse<TRecord>>;
  search(
    params?: ListParams,
    options?: RequestOptions,
  ): Promise<ListResponse<TRecord>>;
  /**
   * Lists selectable records for this resource's `belongsTo` relationship.
   * The server applies the target resource's permissions and actor-aware scope.
   */
  relationship<TTarget = Record<string, unknown>>(
    name: string,
    params?: ListParams,
    options?: RequestOptions,
  ): Promise<ListResponse<TTarget>>;
  find(id: string, options?: RequestOptions): Promise<TRecord>;
  create(
    input: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<TRecord>;
  update(
    id: string,
    input: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<TRecord>;
  delete(id: string, options?: RequestOptions): Promise<void>;
  upload(
    field: string,
    file: Blob,
    options?: RequestOptions & { filename?: string },
  ): Promise<{
    url: string;
    key?: string;
    name: string;
    type: string;
    size: number;
  }>;
  action<TResult = unknown>(
    name: string,
    input?: Record<string, unknown>,
    options?: ActionOptions,
  ): Promise<ActionResult<TResult>>;
}

export interface VerikitClient {
  /**
   * Creates a client for a logical resource name. Pass `path` when the server
   * mounts that resource at a different route segment via `path`.
   */
  resource<TRecord = Record<string, unknown>>(
    name: string,
    options?: { path?: string },
  ): ResourceClient<TRecord>;
}
