import type { FieldSchema, ValidationIssue } from "@verikit/core";

/**
 * Represents an adapter unique-constraint violation.
 * `fields` identifies the resource fields surfaced as validation errors.
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
      message:
        fields[name]?.uniqueMessage ??
        `A record with this ${label} already exists.`,
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
   * Server-defined allow-list of fields eligible for free-text search.
   * An empty list makes the search unsatisfiable.
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
 * Storage abstraction for resources registered with `createServer()`.
 *
 * Adapters normalize storage records into flat API records with string IDs
 * and declared resource field names. Relationships are metadata and are not
 * implicitly populated.
 */
export interface ResourceAdapter<TRecord = Record<string, unknown>> {
  list(params: ResourceListParams): Promise<ResourceListResult<TRecord>>;
  find(
    id: string,
    scope?: Record<string, unknown>,
  ): Promise<TRecord | undefined>;
  /**
   * Creates a record.
   * Unique-constraint violations must be mapped to `UniqueConstraintError`
   * with the affected resource fields.
   */
  create(values: Record<string, unknown>): Promise<TRecord>;
  /**
   * Updates and returns a record, or `undefined` if it no longer exists.
   * Unique-constraint violations must be mapped to `UniqueConstraintError`.
   */
  update(
    id: string,
    values: Record<string, unknown>,
    scope?: Record<string, unknown>,
  ): Promise<TRecord | undefined>;
  /**
   * Deletes a record.
   * Missing records are treated as a successful no-op.
   */
  delete(id: string, scope?: Record<string, unknown>): Promise<void>;
}
