import type { FieldSchema, ValidationIssue } from "@verikit/core";

/**
 * Thrown by an adapter's `create`/`update` when the storage layer rejects a
 * write for violating a unique constraint. `fields` names the resource
 * field(s) involved (translated from whatever column/constraint identifier
 * the storage client reports), so `@verikit/server` can surface it as a
 * per-field validation issue instead of an opaque 500.
 */
export class UniqueConstraintError extends Error {
  /** Resource field names whose unique constraint was violated. */
  readonly fields: readonly string[];

  constructor(fields: readonly string[]) {
    super(`Unique constraint violated on: ${fields.join(", ")}`);
    this.name = "UniqueConstraintError";
    this.fields = fields;
  }
}

/**
 * Builds one validation issue per field named on a `UniqueConstraintError`,
 * using that field's `uniqueMessage` when the schema sets one, or a generic
 * fallback naming the field otherwise.
 */
export function uniqueConstraintIssues(
  error: UniqueConstraintError,
  fields: Record<string, FieldSchema>,
): ValidationIssue[] {
  return error.fields.map((name) => {
    const label = fields[name]?.label ?? name;

    return {
      path: [name],
      message: fields[name]?.uniqueMessage ?? `A record with this ${label} already exists.`,
    };
  });
}

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
  /**
   * Server-authored resource field names eligible for this free-text search.
   * When present, adapters must search only this allow-list; an empty list is
   * an intentionally unsatisfiable search.
   */
  searchFields?: readonly string[];
  /** Column to sort by and its direction. */
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  /** Server-authored equality constraints. Never populate this from client input. */
  scope?: Record<string, unknown>;
  /** Server-validated field filters, never raw query-string input. */
  filters?: Record<string, ResourceFilter>;
}

export interface ResourceFilter {
  eq?: string | number | boolean | null;
  gte?: string | number;
  gt?: string | number;
  lte?: string | number;
  lt?: string | number;
}

/** Result shape returned by `ResourceAdapter.list()`. */
export interface ResourceListResult<TRecord = Record<string, unknown>> {
  records: TRecord[];
  /** Total record count across all pages, for pagination metadata. */
  total: number;
}

/**
 * Storage abstraction used by resources registered with `createServer()`.
 *
 * This interface is storage-agnostic. IDs are passed as raw string path
 * segments; adapters are responsible for coercing them to their storage key
 * type when necessary.
 *
 * Returned records represent API records, not raw storage rows. Adapters must:
 * - expose a canonical string `id`;
 * - map storage names to resource field names; and
 * - omit keys not declared as resource fields.
 *
 * `TRecord` is always flat. Resource relationships are metadata and must not
 * be implicitly populated by adapters. The current server contract does not
 * support nested relationship reads or writes.
 *
 * Supporting populated relationships requires an explicit extension of the
 * server contract, including authorization/redaction and relation pagination.
 */
export interface ResourceAdapter<TRecord = Record<string, unknown>> {
  list(params: ResourceListParams): Promise<ResourceListResult<TRecord>>;
  find(
    id: string,
    scope?: Record<string, unknown>,
  ): Promise<TRecord | undefined>;
  /**
   * Creates a record from the given values.
   *
   * Adapters whose storage client reports a unique-constraint violation by
   * throwing must translate that error to a `UniqueConstraintError` naming
   * the resource field(s) involved, so `@verikit/server` can report it as a
   * per-field validation issue instead of an opaque 500.
   */
  create(values: Record<string, unknown>): Promise<TRecord>;
  /**
   * Updates the record with the given id and returns it.
   *
   * The record may disappear between the server's existence/permission check
   * and this call because those operations are not atomic. Return `undefined`
   * when the record no longer exists so the server can consistently treat it
   * as not found.
   *
   * Adapters whose storage client reports this case by throwing must translate
   * that error to `undefined`.
   *
   * Adapters whose storage client reports a unique-constraint violation by
   * throwing must translate that error to a `UniqueConstraintError`, per
   * `create`'s doc above.
   */
  update(
    id: string,
    values: Record<string, unknown>,
    scope?: Record<string, unknown>,
  ): Promise<TRecord | undefined>;
  /**
   * Deletes the record with the given id.
   *
   * Deletion is idempotent: if the record no longer exists, the operation must
   * succeed as a no-op. Adapters whose storage client reports this case by
   * throwing must catch and suppress that error.
   */
  delete(id: string, scope?: Record<string, unknown>): Promise<void>;
}
