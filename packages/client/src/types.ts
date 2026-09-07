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
   * Cache identity shared by UI bindings. Defaults to a unique client identity.
   * Use a distinct namespace per API, account, tenant, and session. Recreate the
   * client when identity changes; never reuse a namespace for different access.
   * Explicit namespaces allow intentional sharing and SSR hydration.
   */
  cacheNamespace?: string;
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

type StringKey<T> = Extract<keyof T, string>;

export interface ResourceDefinition<
  TRecord extends object = Record<string, unknown>,
  TCreateInput extends object = Partial<Omit<TRecord, "id">>,
  TUpdateInput extends object = Partial<TCreateInput>,
  TActions extends object = Record<string, ActionDefinition>,
  TRelationships extends object = Record<string, RelationshipDefinition>,
  TUploadFields extends string = string,
> {
  record: TRecord;
  create?: TCreateInput;
  update?: TUpdateInput;
  actions?: TActions;
  relationships?: TRelationships;
  uploads?: TUploadFields;
}

export interface ActionDefinition<
  TInput extends object | undefined = Record<string, unknown> | undefined,
  TResult = unknown,
> {
  input?: TInput;
  result: TResult;
}

export interface RelationshipDefinition<
  TRecord extends object = Record<string, unknown>,
> {
  record: TRecord;
}

export type ResourceMap = Record<string, ResourceDefinition>;
type ResourceDefinitions<TResources> = {
  [Name in keyof TResources]: ResourceDefinition<
    object,
    object,
    object,
    object,
    object,
    string
  >;
};

type ResourceRecord<TResource> =
  TResource extends { record: infer TRecord extends object } ? TRecord : never;

type ResourceCreateInput<TResource> =
  TResource extends { create?: infer TCreate extends object }
    ? TCreate
    : Partial<Omit<ResourceRecord<TResource>, "id">>;

type ResourceUpdateInput<TResource> =
  TResource extends { update?: infer TUpdate extends object }
    ? TUpdate
    : Partial<ResourceCreateInput<TResource>>;

type ResourceActions<TResource> =
  TResource extends { actions?: infer TActions extends object }
    ? TActions
    : Record<string, ActionDefinition>;

type ResourceRelationships<TResource> =
  TResource extends { relationships?: infer TRelationships extends object }
    ? TRelationships
    : Record<string, RelationshipDefinition>;

type ResourceUploadFields<TResource> =
  TResource extends { uploads?: infer TUploadFields extends string }
    ? TUploadFields
    : string;

type RelationshipRecord<TRelationship> =
  TRelationship extends RelationshipDefinition<infer TRecord> ? TRecord : never;

type ActionInput<TAction> =
  TAction extends ActionDefinition<infer TInput, unknown> ? TInput : never;

type ActionOutput<TAction> =
  TAction extends ActionDefinition<object | undefined, infer TResult>
    ? TResult
    : never;

interface FieldFilter {
  eq?: string | number | boolean | null;
  gte?: string | number;
  gt?: string | number;
  lte?: string | number;
  lt?: string | number;
}

export interface ListParams<TRecord extends object = Record<string, unknown>> {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: { field: StringKey<TRecord>; direction?: "asc" | "desc" };
  filters?: Partial<Record<StringKey<TRecord>, FieldFilter>>;
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

export interface StoredFile {
  url: string;
  key?: string;
  name: string;
  type: string;
  size: number;
}

export interface ResourceClient<
  TRecord extends object = Record<string, unknown>,
  TCreateInput extends object = Partial<Omit<TRecord, "id">>,
  TUpdateInput extends object = Partial<TCreateInput>,
  TActions extends object = Record<string, ActionDefinition>,
  TRelationships extends object = Record<string, RelationshipDefinition>,
  TUploadFields extends string = string,
> {
  list(
    params?: ListParams<TRecord>,
    options?: RequestOptions,
  ): Promise<ListResponse<TRecord>>;
  search(
    params?: ListParams<TRecord>,
    options?: RequestOptions,
  ): Promise<ListResponse<TRecord>>;
  /**
   * Lists selectable records for this resource's `belongsTo` relationship.
   * The server applies the target resource's permissions and actor-aware scope.
   */
  relationship<Name extends StringKey<TRelationships>>(
    name: Name,
    params?: ListParams<RelationshipRecord<TRelationships[Name]>>,
    options?: RequestOptions,
  ): Promise<ListResponse<RelationshipRecord<TRelationships[Name]>>>;
  relationship<TTarget extends object = Record<string, unknown>>(
    name: string extends keyof TRelationships ? string : never,
    params?: ListParams<TTarget>,
    options?: RequestOptions,
  ): Promise<ListResponse<TTarget>>;
  find(id: string, options?: RequestOptions): Promise<TRecord>;
  create(input: TCreateInput, options?: RequestOptions): Promise<TRecord>;
  update(
    id: string,
    input: TUpdateInput,
    options?: RequestOptions,
  ): Promise<TRecord>;
  delete(id: string, options?: RequestOptions): Promise<void>;
  upload(
    field: TUploadFields,
    file: Blob,
    options?: RequestOptions & { filename?: string },
  ): Promise<StoredFile>;
  action<Name extends StringKey<TActions>>(
    name: Name,
    input?: ActionInput<TActions[Name]>,
    options?: ActionOptions,
  ): Promise<ActionResult<ActionOutput<TActions[Name]>>>;
  action<TResult = unknown>(
    name: string extends keyof TActions ? string : never,
    input?: object,
    options?: ActionOptions,
  ): Promise<ActionResult<TResult>>;
}

type ClientResource<TResource> = ResourceClient<
  ResourceRecord<TResource>,
  ResourceCreateInput<TResource>,
  ResourceUpdateInput<TResource>,
  ResourceActions<TResource>,
  ResourceRelationships<TResource>,
  ResourceUploadFields<TResource>
>;

export interface VerikitClient<
  TResources extends ResourceDefinitions<TResources> = ResourceMap,
> {
  /** Immutable cache identity. Custom clients without one are isolated by object identity. */
  readonly cacheNamespace?: string;
  /**
   * Creates a client for a logical resource name. Pass `path` when the server
   * mounts that resource at a different route segment via `path`.
   */
  resource<Name extends StringKey<TResources>>(
    name: Name,
    options?: { path?: string },
  ): ClientResource<TResources[Name]>;
  resource<TRecord extends object = Record<string, unknown>>(
    name: string extends keyof TResources ? string : never,
    options?: { path?: string },
  ): ResourceClient<TRecord>;
}
