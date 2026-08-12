import type {
  ResourceAdapter,
  ResourceFilter,
  ResourceListParams,
  ResourceListResult,
} from "../adapter.js";

/** Options for {@link createInMemoryAdapter}. */
export interface InMemoryAdapterOptions<TRecord> {
  /**
   * Field names eligible for free-text `search`, further narrowed per-request by
   * `params.searchFields` when the caller supplies one (mirroring how `@verikit/drizzle`
   * and `@verikit/prisma` intersect their own `.searchable()` fields with it).
   */
  searchableFields?: readonly string[];
  /** Default values merged under a `create()` call's own `values`. */
  createDefaults?: () => Partial<TRecord>;
}

function matchesScope(
  record: Record<string, unknown>,
  scope: Record<string, unknown> | undefined,
): boolean {
  return (
    !scope ||
    Object.entries(scope).every(([name, value]) => record[name] === value)
  );
}

function matchesFilters(
  record: Record<string, unknown>,
  filters: Record<string, ResourceFilter> | undefined,
): boolean {
  if (!filters) return true;

  return Object.entries(filters).every(([name, filter]) => {
    const value = record[name];
    return (
      (filter.eq === undefined || value === filter.eq) &&
      (filter.gte === undefined || value! >= filter.gte) &&
      (filter.gt === undefined || value! > filter.gt) &&
      (filter.lte === undefined || value! <= filter.lte) &&
      (filter.lt === undefined || value! < filter.lt)
    );
  });
}

function matchesSearch(
  record: Record<string, unknown>,
  params: ResourceListParams,
  searchableFields: readonly string[],
): boolean {
  if (!params.search) return true;

  const term = params.search.toLowerCase();
  return searchableFields.some(
    (field) =>
      params.searchFields?.includes(field) !== false &&
      String(record[field] ?? "")
        .toLowerCase()
        .includes(term),
  );
}

/**
 * Builds a tiny in-memory `ResourceAdapter`, implementing the same `scope`/`filters`/`search`/
 * `sort` semantics `@verikit/drizzle` and `@verikit/prisma` enforce against a real database, for
 * tests across the workspace that need a real (if storage-free) adapter rather than a hand-rolled
 * mock. A single shared implementation means a change to what these params mean only has to be
 * made once, instead of drifting across each package's own copy.
 */
export function createInMemoryAdapter<
  TRecord extends { id: string } & Record<string, unknown>,
>(
  initial: readonly TRecord[] = [],
  options: InMemoryAdapterOptions<TRecord> = {},
): ResourceAdapter<TRecord> & { records: TRecord[] } {
  const { searchableFields = [], createDefaults } = options;
  const records: TRecord[] = initial.map((record) => ({ ...record }));

  return {
    records,

    async list(
      params: ResourceListParams,
    ): Promise<ResourceListResult<TRecord>> {
      let filtered = records.filter(
        (record) =>
          matchesScope(record, params.scope) &&
          matchesFilters(record, params.filters) &&
          matchesSearch(record, params, searchableFields),
      );

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
    ): Promise<TRecord | undefined> {
      return records.find(
        (record) => record.id === id && matchesScope(record, scope),
      );
    },

    async create(values: Record<string, unknown>): Promise<TRecord> {
      // A per-instance UUID avoids colliding with an adapter's own seeded
      // ids (a shared module-level counter starting at 1 would collide with
      // a seeded `id: "1"` the moment a test creates a new record).
      const record = {
        id: crypto.randomUUID(),
        ...createDefaults?.(),
        ...values,
      } as TRecord;
      records.push(record);
      return record;
    },

    async update(
      id: string,
      values: Record<string, unknown>,
      scope?: Record<string, unknown>,
    ): Promise<TRecord | undefined> {
      const index = records.findIndex(
        (record) => record.id === id && matchesScope(record, scope),
      );
      if (index === -1) {
        return undefined;
      }
      records[index] = { ...records[index], ...values } as TRecord;
      return records[index];
    },

    async delete(id: string, scope?: Record<string, unknown>): Promise<void> {
      const index = records.findIndex(
        (record) => record.id === id && matchesScope(record, scope),
      );
      if (index !== -1) {
        records.splice(index, 1);
      }
    },
  };
}
